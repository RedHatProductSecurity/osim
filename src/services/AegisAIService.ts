import type {
  AegisAICVEAnalysisParamsType,
  AegisAIComponentAnalysisParamsType,
  AegisAICVEAnalysisWithContextParamsType,
  AegisFeature,
  AegisFeatureResponseMap,
} from '@/types/aegisAI';
import { osimRuntime } from '@/stores/osimRuntime';
import { useToastStore } from '@/stores/ToastStore';

export type AegisAIFetchCallbacks = {
  beforeFetch?: (options: AegisAIFetchOptions) => Promise<void> | void;
  // afterFetch?: (response: Response) => Promise<void> | void;
};

type CacheOptions = 'default' | 'force-cache' | 'no-cache' | 'only-if-cached' | 'reload';

export type AegisAIGetFetchOptions = {
  cache?: CacheOptions;
  data?: never;
  method: 'GET' | 'get';
  params?: Record<string, any>;
  url: string;
};

export type AegisAIPostFetchOptions = {
  cache?: CacheOptions;
  data?: Record<string, any>;
  method: 'POST' | 'post';
  params?: Record<string, any>;
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
    const errorMsg = 'AEGIS-AI backend not configured in runtime';
    console.error(errorMsg);
    useToastStore().addToast({
      title: 'Configuration Error',
      body: 'AEGIS-AI service is not available.',
    });
    return Promise.reject(errorMsg);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${config.url}${queryString}`, {
      method: config?.method ?? 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      mode: 'cors',
      credentials: 'include',
      cache: config?.cache,
      body,
    });
  } catch (e) {
    console.error('❌ AEGIS-AI Fetch failed:', e);
    return Promise.reject(e);
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

function paramsFrom(params: Record<string, any>) {
  const urlParams = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined) {
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

export class AegisAIService {
  /**
   * Analyze a component using AEGIS-AI intelligence
   * @param params Component analysis parameters
   * @returns AI-generated component analysis
   */
  async analyzeComponent(params: AegisAIComponentAnalysisParamsType): Promise<any> {
    try {
      const result = await aegisAIFetch({
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
      const result = await aegisAIFetch({
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

      const result = await aegisAIFetch({
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

  /**
   * Generate a response using AEGIS-AI (for the web console)
   * @param prompt The prompt to send to AEGIS-AI
   * @returns Generated response
   */
  async generateResponse(prompt: string): Promise<any> {
    try {
      const result = await aegisAIFetch({
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

  /**
   * Get the AEGIS-AI console page (returns HTML)
   */
  async getConsole(): Promise<string> {
    try {
      const result = await aegisAIFetch({
        method: 'GET',
        url: '/console',
      });

      return result.data;
    } catch (error) {
      console.error('AegisAIService::getConsole() Error:', error);
      throw error;
    }
  }
}
