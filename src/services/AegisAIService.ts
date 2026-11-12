import { type Ref, ref } from 'vue';

import type {
  AegisAICVEAnalysisParamsType,
  AegisAIComponentAnalysisParamsType,
  AegisAICVEAnalysisWithContextParamsType,
  AegisFeature,
  AegisFeedbackPayload,
  AegisFeatureResponseMap,
  AegisKpiMetrics,
  AegisKpiQuery,
  AegisBotKpiMetrics,
  AegisBotKpiPage,
  AegisBotKpiOptions,
  AegisBotKpiProgressCallback,
  AegisKpiFeatureParamType,
  AegisProgrammaticFeedbackPayload,
  AegisMultiAnalysisParams,
  AegisMultiAnalysisResponse,
} from '@/types/aegisAI';
import { useAuthStore } from '@/stores/AuthStore';
import { osimRuntime } from '@/stores/osimRuntime';
import { getNextAccessToken } from '@/services/OsidbAuthService';
import { continuation, createKpiDelivery } from '@/services/aegisKpiDelivery';

export type AegisAIFetchCallbacks = {
  beforeFetch?: (options: AegisAIFetchOptions) => Promise<void> | void;
  // afterFetch?: (response: Response) => Promise<void> | void;
};

type CacheOptions = RequestCache;

export type AegisAIGetFetchOptions = {
  cache?: CacheOptions;
  data?: never;
  headers?: Record<string, string>;
  method: 'GET' | 'get';
  params?: Record<string, any>;
  signal?: AbortSignal;
  url: string;
};

export type AegisAIPostFetchOptions = {
  cache?: CacheOptions;
  data?: Record<string, any>;
  headers?: Record<string, string>;
  method: 'POST' | 'post';
  params?: Record<string, any>;
  signal?: AbortSignal;
  url: string;
};

export type AegisAIFetchOptions =
  | AegisAIGetFetchOptions
  | AegisAIPostFetchOptions;

export async function aegisAIFetch(config: AegisAIFetchOptions, factoryOptions?: AegisAIFetchCallbacks) {
  if (factoryOptions?.beforeFetch) {
    await factoryOptions.beforeFetch(config);
  }

  const body = config?.data ? JSON.stringify(config.data) : undefined;
  const queryString = queryStringFromParams(config?.params ?? {});
  const baseUrl = osimRuntime.value.backends.aegisai;

  if (!baseUrl) {
    const errorMsg = 'AEGIS-AI service is not available. Backend not configured.';
    console.error('AEGIS-AI backend not configured in runtime');
    return Promise.reject({ errorMsg, isConfigError: true });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${config.url}${queryString}`, {
      method: config?.method ?? 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...config.headers,
      },
      mode: 'cors',
      credentials: 'include',
      cache: config?.cache,
      signal: config.signal,
      body,
    });
  } catch (e) {
    if (config.signal?.aborted) throw e;
    console.error('❌ AEGIS-AI Fetch failed:', e);
    const isNetworkError = e instanceof TypeError;
    const errorMsg = isNetworkError
      ? 'Unable to connect to AEGIS-AI server. Please check your network connection or try again later.'
      : 'AEGIS-AI request failed unexpectedly.';
    return Promise.reject({ message: errorMsg, isNetworkError, originalError: e });
  }

  if (!response.ok) {
    let data;
    const contentType = response.headers.get('content-type');

    if (contentType?.startsWith('text/html')) {
      data = await response.text();
    } else {
      const textData = await response.text();
      try {
        data = JSON.parse(textData);
      } catch {
        data = textData;
      }
    }

    const detail = data?.detail ?? data?.error ?? data?.message;
    const statusInfo = `HTTP ${response.status} ${response.statusText}`;
    const errorMsg = detail
      ? `${detail} (${statusInfo})`
      : `AEGIS-AI server error (${statusInfo}). Please try again or contact support.`;

    return Promise.reject({
      response: {
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        redirected: response.redirected,
        status: response.status,
        statusText: response.statusText,
        type: response.type,
        url: response.url,
        data,
      },
      data,
      message: errorMsg,
    });
  }

  if (response.status === 204) {
    return { response, data: undefined };
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const textData = await response.text();
    try {
      return { data: JSON.parse(textData), response };
    } catch {
      return { data: textData, response };
    }
  } else {
    return { data: await response.text(), response };
  }
}

// Both KPI sources load in parallel. Share token acquisition per auth store so
// an expired token cannot trigger competing refreshes (including token rotation).
const pendingAuthHeaders = new WeakMap<ReturnType<typeof useAuthStore>, Promise<Record<string, string>>>();

function aegisAuthHeaders(): Promise<Record<string, string>> {
  const authStore = useAuthStore();
  let pending = pendingAuthHeaders.get(authStore);
  if (!pending) {
    pending = getNextAccessToken()
      .then(token => ({ Authorization: `Bearer ${token}` }))
      .finally(() => pendingAuthHeaders.delete(authStore));
    pendingAuthHeaders.set(authStore, pending);
  }
  return pending;
}

function paramsFrom(params: Record<string, any>) {
  const urlParams = new URLSearchParams();
  for (const key in params) {
    if (Array.isArray(params[key])) {
      params[key].forEach((value: string) => urlParams.append(key, value));
    } else if (params[key] !== undefined) {
      urlParams.set(key, params[key]);
    }
  }
  return urlParams;
}

function queryStringFromParams(params: Record<string, any>) {
  const urlParams = paramsFrom(params);
  const queryString = urlParams.toString();
  return queryString ? `?${queryString}` : '';
}

function isRetryableKpiError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) return false;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return false;
  const { data, status } = response as { data?: { retry_exhausted?: unknown }; status?: unknown };
  return status === 503 && data?.retry_exhausted !== true;
}

function retryDelay(attempt: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, Math.min(250 * 2 ** attempt, 1000));
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export class AegisAIService {
  // Monotonic id of the latest bot KPI fetch: starting a new one supersedes
  // any pagination still in flight on this service instance.
  private botKpiController?: AbortController;
  private botKpiFetchId = 0;
  isFetching: Ref<boolean>;
  // Optional hook invoked after each page of the paginated bot KPI fetch
  // (see getBotKpiMetrics) with the flaws delivered so far and selected total.
  onBotKpiProgress?: AegisBotKpiProgressCallback;
  requestDuration: Ref<number>;

  constructor() {
    this.isFetching = ref(false);
    this.requestDuration = ref(0);
  }

  private async fetchBotKpiPage(
    query: AegisKpiQuery, options: AegisBotKpiOptions, cursor: null | string, runId?: string,
  ) {
    return this.fetchKpi({
      method: 'GET',
      url: '/analysis/kpi/osidb-bot',
      signal: options.signal,
      params: { ...query, cursor: cursor ?? undefined, delivery: true, detail: true, limit: 400, run_id: runId },
    });
  }

  private async fetchBotKpiRun(
    query: AegisKpiQuery, options: AegisBotKpiOptions, fetchId: number,
    onProgress?: AegisBotKpiProgressCallback,
  ): Promise<AegisBotKpiMetrics> {
    const delivery = createKpiDelivery();
    let nextCursor: null | string = null;
    let runId: string | undefined;
    let pages = 0;
    let idleResponses = 0;
    for (let request = 0; request < 10000 && pages < 200; request++) {
      options.signal?.throwIfAborted();
      const result = await this.fetchBotKpiPage(query, options, nextCursor, runId);
      options.signal?.throwIfAborted();
      if (fetchId !== this.botKpiFetchId) throw new Error('osidb-bot KPI fetch was superseded by a newer request.');
      const data = result.data as AegisBotKpiPage;
      const snapshot = delivery.accept(data);
      const token = continuation(data);
      const waiting = data.delivery?.deferred || data.delivery?.selection_complete === false || !snapshot;
      idleResponses = waiting && token === nextCursor ? idleResponses + 1 : 0;
      if (snapshot) {
        runId = snapshot.delivery?.run_id;
        if (snapshot.delivery && snapshot.delivery.selection_complete !== false) {
          onProgress?.(snapshot.delivery.received_flaws, snapshot.delivery.selected_flaws);
        }
        options.onSnapshot?.(snapshot);
        if (!token) return snapshot;
      }
      nextCursor = token;
      if (idleResponses >= 120) throw new Error('KPI delivery remained deferred. Select Refresh to try again.');
      if (waiting) await retryDelay(2, options.signal);
      else pages++;
    }
    const limit = pages >= 200 ? '200 pages' : '10000 discovery requests';
    throw new Error(`osidb-bot KPI pagination did not complete after ${limit}.`);
  }

  private async fetchKpi(config: AegisAIGetFetchOptions) {
    for (let attempt = 0; ; attempt++) {
      config.signal?.throwIfAborted();
      try {
        return await this.fetch({ ...config, cache: 'no-store' }, {
          beforeFetch: async (options) => {
            options.headers = await aegisAuthHeaders();
            options.signal?.throwIfAborted();
          },
        });
      } catch (error) {
        if (attempt >= 3 || !isRetryableKpiError(error)) throw error;
        await retryDelay(attempt, config.signal);
      }
    }
  }

  /**
   * Analyze a component using AEGIS-AI intelligence
   * @param params Component analysis parameters
   * @returns AI-generated component analysis
   */
  async analyzeComponent(params: AegisAIComponentAnalysisParamsType): Promise<any> {
    try {
      const result = await this.fetch({
        method: 'GET',
        url: '/analysis/component',
        params: {
          feature: params.feature,
          component_name: params.component,
          ...(params.detail !== undefined && { detail: params.detail }),
        },
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::analyzeComponent() Error:', error);
      throw error;
    }
  }

  /**
   * Analyze a CVE using AEGIS-AI capabilities
   * @param params CVE analysis parameters
   * @returns AI-generated analysis response
   */
  async analyzeCVE(params: AegisAICVEAnalysisParamsType): Promise<any> {
    try {
      const result = await this.fetch({
        method: 'GET',
        url: '/analysis/cve',
        params: {
          feature: params.feature,
          cve_id: params.cve_id,
          ...(params.detail !== undefined && { detail: params.detail }),
        },
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::analyzeCVE() Error:', error);
      throw error;
    }
  }

  /** Requests multiple CVE analyses in one backend call. */
  async analyzeCVEMultipleFeatures(params: AegisMultiAnalysisParams): Promise<AegisMultiAnalysisResponse> {
    const result = await this.fetch({
      method: 'POST',
      url: '/analysis/cve',
      data: params,
    });
    return result.data;
  }

  /**
   * Analyze a CVE with enhanced context using AEGIS-AI capabilities
   * Uses the new POST endpoint that accepts additional context in the request body
   * @param params CVE analysis parameters with context
   * @returns AI-generated analysis response with proper typing based on feature
   */
  async analyzeCVEWithContext<TFeature extends AegisFeature>(
    params: { feature: TFeature } & AegisAICVEAnalysisWithContextParamsType,
  ): Promise<AegisFeatureResponseMap[TFeature]> {
    try {
      const { detail, feature, ...contextData } = params;

      const result = await this.fetch({
        method: 'POST',
        url: `/analysis/cve/${feature}`,
        params: {
          ...(detail !== undefined && { detail }),
        },
        data: contextData,
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::analyzeCVEWithContext() Error:', error);
      throw error;
    }
  }

  async fetch(config: AegisAIFetchOptions, factoryOptions?: AegisAIFetchCallbacks): ReturnType<typeof aegisAIFetch> {
    this.isFetching.value = true;
    const requestStartTime = Date.now();
    try {
      return await aegisAIFetch(config, factoryOptions);
    } finally {
      this.isFetching.value = false;
      this.requestDuration.value = Date.now() - requestStartTime;
    }
  }

  /**
   * Generate a response using AEGIS-AI (for the web console)
   * @param prompt The prompt to send to AEGIS-AI
   * @returns Generated response
   */
  async generateResponse(prompt: string): Promise<any> {
    try {
      const result = await this.fetch({
        method: 'POST',
        url: '/generate_response',
        data: { prompt },
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::generateResponse() Error:', error);
      throw error;
    }
  }

  /** Publish cumulative snapshots while fetching a stable delivery run. */
  async getBotKpiMetrics(query: AegisKpiQuery = {}, options: AegisBotKpiOptions = {}): Promise<AegisBotKpiMetrics> {
    this.botKpiController?.abort(new Error('osidb-bot KPI fetch was superseded by a newer request.'));
    const controller = new AbortController();
    this.botKpiController = controller;
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const fetchId = ++this.botKpiFetchId;
    const onProgress = this.onBotKpiProgress;
    try {
      return await this.fetchBotKpiRun(query, { ...options, signal: controller.signal }, fetchId, onProgress);
    } finally {
      options.signal?.removeEventListener('abort', abort);
    }
  }

  /**
   * Get the AEGIS-AI console page (returns HTML)
   */
  async getConsole(): Promise<string> {
    try {
      const result = await this.fetch({
        method: 'GET',
        url: '/console',
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::getConsole() Error:', error);
      throw error;
    }
  }

  async getKpiMetrics(
    feature: AegisKpiFeatureParamType = 'all', query: AegisKpiQuery = {}, signal?: AbortSignal,
  ): Promise<AegisKpiMetrics> {
    try {
      const result = await this.fetchKpi({
        method: 'GET',
        url: '/analysis/kpi/cve',
        params: { feature, ...query },
        signal,
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::getKpiMetrics() Error:', error);
      throw error;
    }
  }

  /**
   * Send feedback for an Aegis AI suggestion
   * @param payload Feedback payload
   * @returns Feedback response from backend
   */
  async sendFeedback(payload: AegisFeedbackPayload): Promise<void> {
    try {
      await this.fetch({
        method: 'POST',
        url: '/feedback',
        data: payload,
      });
    } catch (error) {
      console.error('AegisAIService::sendFeedback() Error:', error);
    }
  }

  /**
   * Send programmatic feedback when user saves a flaw with AI suggestions
   * @param payload Programmatic feedback payload
   * @returns Promise that resolves when feedback is sent
   */
  async sendProgrammaticFeedback(payload: AegisProgrammaticFeedbackPayload): Promise<void> {
    try {
      await this.fetch({
        method: 'POST',
        url: '/programmatic-feedback',
        data: {
          feature: payload.feature,
          cve_id: payload.cveId,
          email: payload.email,
          suggested_value: payload.suggested_value,
          submitted_value: payload.submitted_value,
        },
      });
    } catch (error: unknown) {
      // 409 Conflict means duplicate feedback - this is expected and not an error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 409) {
          console.debug('AegisAIService::sendProgrammaticFeedback() Duplicate feedback ignored');
          return;
        }
      }
      // Log other errors but don't throw - programmatic feedback should not block flaw save
      console.error('AegisAIService::sendProgrammaticFeedback() Error:', error);
    }
  }
}
