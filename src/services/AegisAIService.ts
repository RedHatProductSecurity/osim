import { type Ref, ref } from 'vue';

import type {
  AegisAICVEAnalysisParamsType,
  AegisAIComponentAnalysisParamsType,
  AegisAICVEAnalysisWithContextParamsType,
  AegisFeature,
  AegisFeedbackPayload,
  AegisFeatureResponseMap,
  AegisKpiMetrics,
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
  isFetching: Ref<boolean>;
  requestDuration: Ref<number>;

  constructor() {
    this.isFetching = ref(false);
    this.requestDuration = ref(0);
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

  async getKpiMetrics(feature: 'all' | AegisFeature = 'all'): Promise<AegisKpiMetrics> {
    try {
      const result = await this.fetch({
        method: 'GET',
        url: '/analysis/kpi/cve',
        params: { feature },
      });

      return result.data;
      return {
        acceptance_percentage: 76.0,
        entries: [
          {
            datetime: '2025-06-11 15:10:10.259',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-13 05:01:19.330',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-15 01:32:28.817',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-16 12:38:02.170',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-18 20:52:58.836',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-20 15:34:42.685',
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-22 05:54:32.537',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-24 06:10:07.619',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-25 05:06:29.785',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-27 13:42:05.736',
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-06-29 05:40:18.096',
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-01 02:41:17.490',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-03 22:48:37.632',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-05 00:05:51.262',
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-06 03:57:42.801',
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-08 10:44:53.033',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-10 02:26:15.689',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-12 00:19:50.044',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-14 22:09:02.592',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-15 22:43:43.549',
            accepted: false,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-07-17 01:41:57.739',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-19 02:35:41.665',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-21 01:22:46.777',
            accepted: false,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-23 14:14:21.979',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-25 19:20:48.783',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-26 11:29:54.912',
            accepted: false,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-28 20:01:39.920',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-07-30 00:05:07.680',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-01 23:03:25.716',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-03 09:37:35.083',
            accepted: false,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-04 08:44:30.478',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-06 09:10:00.113',
            accepted: false,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-08 04:37:02.899',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-10 14:15:20.372',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-12 10:00:58.550',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-14 17:01:45.884',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-15 09:23:01.085',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-17 02:24:24.126',
            accepted: false,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-19 22:44:09.703',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-21 09:46:07.272',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-23 22:11:21.321',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-24 23:04:44.399',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-26 05:55:54.027',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-28 02:34:39.649',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-08-30 04:23:13.420',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-09-01 05:21:13.887',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-09-03 05:50:10.486',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-09-04 04:11:07.717',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-09-06 07:30:13.984',
            accepted: false,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-09-08 14:03:56.776',
            accepted: true,
            aegis_version: '1.1.0',
          },
          {
            datetime: '2025-09-10 21:43:26.097',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-12 08:53:45.814',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-13 22:38:39.254',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-15 11:23:08.370',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-17 03:39:23.516',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-19 09:10:02.983',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-21 03:46:56.905',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-23 18:44:11.732',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-24 23:21:58.840',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-26 13:55:28.377',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-28 04:02:08.411',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-09-30 17:32:47.581',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-02 22:08:31.449',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-03 22:07:50.534',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-05 00:15:44.946',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-07 09:25:47.325',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-09 09:42:12.463',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-11 13:29:36.520',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-13 19:11:50.616',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-14 07:10:50.246',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-16 20:54:53.657',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-18 05:51:28.852',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-20 18:58:17.184',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-22 18:59:35.288',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-23 18:09:56.114',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-25 02:47:30.657',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-27 11:44:33.837',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-29 09:02:09.890',
            accepted: false,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-10-31 13:09:24.405',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-11-02 07:02:16.079',
            accepted: true,
            aegis_version: '1.2.0',
          },
          {
            datetime: '2025-11-03 21:05:40.341',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-05 18:53:02.203',
            accepted: false,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-07 11:16:27.831',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-09 10:16:08.020',
            accepted: false,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-11 16:44:25.425',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-12 00:11:46.104',
            accepted: false,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-14 00:08:41.574',
            accepted: false,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-16 00:21:52.823',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-18 21:41:26.735',
            accepted: false,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-20 14:48:05.335',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-22 13:57:00.589',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-23 12:49:17.458',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-25 05:16:03.350',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-27 10:04:11.864',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-11-29 06:53:00.794',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-12-01 10:49:53.714',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-12-02 20:36:59.648',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-12-04 00:23:39.295',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-12-06 00:31:51.321',
            accepted: true,
            aegis_version: '1.3.0',
          },
          {
            datetime: '2025-12-08 08:20:31.186',
            accepted: true,
            aegis_version: '1.3.0',
          },
        ],
      };
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
}
