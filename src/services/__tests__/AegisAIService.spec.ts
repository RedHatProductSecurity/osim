import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

import { osimRuntime } from '@/stores/osimRuntime';
import { useAuthStore } from '@/stores/AuthStore';
import { server } from '@/__tests__/setup';
import { encodeJWT } from '@/__tests__/helpers';
import type {
  AegisAIComponentFeatureNameType,
  AegisAICVEAnalysisParamsType,
  AegisAIComponentAnalysisParamsType,
  AegisBotKpiEntry,
  AegisBotKpiPage,
  AegisKpiMetrics,
} from '@/types/aegisAI';

import { AegisAIService } from '../AegisAIService';

const botEntry = (cveId: string): AegisBotKpiEntry => ({
  aegis_version: '0.9.2',
  confidence: 0.9,
  cve_id: cveId,
  data_quality: 0.8,
  datetime: '2026-09-01T00:00:00Z',
  deviation: 0,
  feature: 'impact',
  type: 'AI-Bot',
});

// Mock the stores
const mockAddToast = vi.fn();
vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: mockAddToast,
  })),
}));

describe('aegisAIService', () => {
  let service: AegisAIService;
  const mockBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    setActivePinia(createPinia());
    service = new AegisAIService();

    // Ensure aegisai backend URL is set consistently for all tests
    // @ts-expect-error osimRuntime is a readOnly global ref in runtime, but mocked during testing
    osimRuntime.value.backends.aegisai = mockBaseUrl;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockAddToast.mockClear();
  });

  describe('analyzeComponent', () => {
    it('should make correct API call with parameters', async () => {
      const mockResponse = { component: 'test-component', analysis: 'AI analysis' };
      const params: AegisAIComponentAnalysisParamsType = {
        feature: 'component-intelligence',
        component: 'test-component',
        detail: true,
      };

      server.use(
        http.get(`${mockBaseUrl}/analysis/component`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('feature')).toBe('component-intelligence');
          expect(url.searchParams.get('component_name')).toBe('test-component');
          expect(url.searchParams.get('detail')).toBe('true');
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await service.analyzeComponent(params);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      const params: AegisAIComponentAnalysisParamsType = {
        feature: 'component-intelligence',
        component: 'invalid-component',
      };

      server.use(
        http.get(`${mockBaseUrl}/analysis/component`, () =>
          HttpResponse.json({ error: 'Component not found' }, { status: 404 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.analyzeComponent(params)).rejects.toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('analyzeCVE', () => {
    it('should make correct API call with parameters', async () => {
      const mockResponse = { cve_id: 'CVE-2024-1234', analysis: 'CVE analysis' };
      const params: AegisAICVEAnalysisParamsType = {
        feature: 'suggest-impact',
        cve_id: 'CVE-2024-1234',
      };

      server.use(
        http.get(`${mockBaseUrl}/analysis/cve`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('feature')).toBe('suggest-impact');
          expect(url.searchParams.get('cve_id')).toBe('CVE-2024-1234');
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await service.analyzeCVE(params);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      const params: AegisAICVEAnalysisParamsType = {
        feature: 'suggest-impact',
        cve_id: 'CVE-2024-9999',
      };

      server.use(
        http.get(`${mockBaseUrl}/analysis/cve`, () =>
          HttpResponse.json({ error: 'CVE not found' }, { status: 404 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.analyzeCVE(params)).rejects.toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('analyzeCVEWithContext', () => {
    it('should make correct API call with context data', async () => {
      const mockResponse = { cve_id: 'CVE-2021-47553', analysis: 'Enhanced CVE analysis' };
      const feature: AegisAIComponentFeatureNameType = 'suggest-cwe';
      const params = {
        feature,
        cve_id: 'CVE-2021-47553',
        components: ['kernel', 'sched/scs'],
        title: 'Reset task stack state in bringup_cpu()',
        trackers: [],
        comment_zero: 'In the Linux kernel, the following vulnerability has been resolved...',
        detail: true,
      };

      server.use(
        http.post(`${mockBaseUrl}/analysis/cve/suggest-cwe`, async ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('detail')).toBe('true');

          const body = await request.json();
          expect(body).toEqual({
            cve_id: 'CVE-2021-47553',
            components: ['kernel', 'sched/scs'],
            title: 'Reset task stack state in bringup_cpu()',
            trackers: [],
            comment_zero: 'In the Linux kernel, the following vulnerability has been resolved...',
          });

          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await service.analyzeCVEWithContext(params);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      const feature: AegisAIComponentFeatureNameType = 'suggest-cwe';
      const params = {
        feature,
        cve_id: 'CVE-2024-invalid',
      };

      server.use(
        http.post(`${mockBaseUrl}/analysis/cve/suggest-cwe`, () =>
          HttpResponse.json({ error: 'Invalid CVE format' }, { status: 400 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.analyzeCVEWithContext(params)).rejects.toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('analyzeCVEMultipleFeatures', () => {
    it('posts the current context and features and preserves partial failures', async () => {
      const params = {
        cve_id: 'CVE-2024-1234',
        features: ['suggest-impact', 'suggest-cwe'] as AegisAIComponentFeatureNameType[],
        title: 'Unsaved title',
        comment_zero: 'Current description',
        components: ['kernel'],
      };
      const response = {
        results: { 'suggest-impact': { impact: 'IMPORTANT' }, 'suggest-cwe': null },
        errors: { 'suggest-cwe': { error: 'RuntimeError', detail: 'Feature failed' } },
      };
      server.use(http.post(`${mockBaseUrl}/analysis/cve`, async ({ request }) => {
        expect(new URL(request.url).search).toBe('');
        expect(await request.json()).toEqual(params);
        return HttpResponse.json(response);
      }));

      expect(await service.analyzeCVEMultipleFeatures(params)).toEqual(response);
      expect(service.isFetching.value).toBe(false);
    });

    it('propagates request failures and clears loading state', async () => {
      server.use(http.post(`${mockBaseUrl}/analysis/cve`, () =>
        HttpResponse.json({ detail: 'Rate limit exceeded' }, { status: 429 }),
      ));

      await expect(service.analyzeCVEMultipleFeatures({ cve_id: 'CVE-2024-1234' }))
        .rejects.toMatchObject({ response: { status: 429 } });
      expect(service.isFetching.value).toBe(false);
    });
  });

  describe('generateResponse', () => {
    it('should make correct API call with prompt', async () => {
      const mockResponse = { response: 'Generated AI response' };
      const prompt = 'Analyze this vulnerability';

      server.use(
        http.post(`${mockBaseUrl}/generate_response`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ prompt });
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await service.generateResponse(prompt);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors', async () => {
      server.use(
        http.post(`${mockBaseUrl}/generate_response`, () =>
          HttpResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.generateResponse('test')).rejects.toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('getConsole', () => {
    it('should retrieve console HTML', async () => {
      const mockHtml = '<html><body>AEGIS-AI Console</body></html>';

      server.use(
        http.get(`${mockBaseUrl}/console`, () =>
          new HttpResponse(mockHtml, {
            headers: { 'Content-Type': 'text/html' },
          }),
        ),
      );

      const result = await service.getConsole();
      expect(result).toBe(mockHtml);
    });

    it('should handle errors', async () => {
      server.use(
        http.get(`${mockBaseUrl}/console`, () =>
          HttpResponse.json({ error: 'Service unavailable' }, { status: 503 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.getConsole()).rejects.toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('network errors', () => {
    it('should reject with descriptive error on network connection failure', async () => {
      server.use(
        http.get(`${mockBaseUrl}/analysis/cve`, () => {
          return HttpResponse.error();
        }),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const params: AegisAICVEAnalysisParamsType = {
        feature: 'suggest-impact',
        cve_id: 'CVE-2024-1234',
      };

      await expect(service.analyzeCVE(params)).rejects.toMatchObject({
        message: 'Unable to connect to AEGIS-AI server. Please check your network connection or try again later.',
        isNetworkError: true,
      });

      // Toast is now handled by composables, not service
      expect(mockAddToast).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getKpiMetrics', () => {
    let accessToken: string;

    beforeEach(() => {
      accessToken = encodeJWT({ exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1337 });
      useAuthStore().accessToken = accessToken;
    });

    const mockKpiMetrics: Omit<AegisKpiMetrics, 'all'> = {
      'suggest-cwe': {
        acceptance_percentage: 75.5,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
          {
            datetime: '2025-01-16 11:00:00.000',
            accepted: false,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-description': {
        acceptance_percentage: 80.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-impact': {
        acceptance_percentage: 70.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-mitigation': {
        acceptance_percentage: 73.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-statement': {
        acceptance_percentage: 85.0,
        entries: [
          {
            datetime: '2025-01-15 10:00:00.000',
            accepted: true,
            aegis_version: '1.0.0',
          },
        ],
      },
      'suggest-title': {
        acceptance_percentage: 78.0,
        entries: [],
      },
      'suggest-cvss': {
        acceptance_percentage: 82.0,
        entries: [],
      },
    };

    it('should make correct API call with "all" feature parameter', async () => {
      server.use(
        http.get(`${mockBaseUrl}/analysis/kpi/cve`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('feature')).toBe('all');
          expect(request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
          return HttpResponse.json(mockKpiMetrics);
        }),
      );

      const result = await service.getKpiMetrics('all');
      expect(result).toEqual(mockKpiMetrics);
    });

    it('should make correct API call with specific feature parameter', async () => {
      const singleFeatureMetrics = {
        'suggest-cwe': mockKpiMetrics['suggest-cwe'],
      };

      server.use(
        http.get(`${mockBaseUrl}/analysis/kpi/cve`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('feature')).toBe('suggest-cwe');
          return HttpResponse.json(singleFeatureMetrics);
        }),
      );

      const result = await service.getKpiMetrics('suggest-cwe');
      expect(result).toEqual(singleFeatureMetrics);
    });

    it('should default to "all" when no feature parameter is provided', async () => {
      server.use(
        http.get(`${mockBaseUrl}/analysis/kpi/cve`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('feature')).toBe('all');
          return HttpResponse.json(mockKpiMetrics);
        }),
      );

      const result = await service.getKpiMetrics();
      expect(result).toEqual(mockKpiMetrics);
    });

    it('encodes component, timestamp and repeated version filters on both KPI endpoints', async () => {
      const query = {
        detail: true,
        component: 'kernel',
        aegis_version: ['0.9.2+build1', ''],
        recorded_after: '2026-09-01T00:00:00Z',
        recorded_before: '2026-09-30T23:59:59.999Z',
      };
      for (const path of ['cve', 'osidb-bot']) {
        server.use(http.get(`${mockBaseUrl}/analysis/kpi/${path}`, ({ request }) => {
          const params = new URL(request.url).searchParams;
          expect(params.get('detail')).toBe('true');
          expect(params.get('component')).toBe('kernel');
          expect(params.getAll('aegis_version')).toEqual(['0.9.2+build1', '']);
          expect(params.get('recorded_after')).toBe(query.recorded_after);
          expect(params.get('recorded_before')).toBe(query.recorded_before);
          expect(params.has('changed_after')).toBe(false);
          return HttpResponse.json(path === 'cve'
            ? mockKpiMetrics
            : { entries: [], features: {}, total_flaws_processed: 0 });
        }));
      }
      await service.getKpiMetrics('all', query);
      await service.getBotKpiMetrics(query);
    });

    it('does not silently treat an old aggregate-only bot endpoint as an empty report', async () => {
      server.use(http.get(`${mockBaseUrl}/analysis/kpi/osidb-bot`, () =>
        HttpResponse.json({ total_flaws_processed: 10, features: {} }),
      ));
      await expect(service.getBotKpiMetrics()).rejects.toThrow('does not support detailed bot KPI reports');
    });

    it('should handle errors', async () => {
      server.use(
        http.get(`${mockBaseUrl}/analysis/kpi/cve`, () =>
          HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.getKpiMetrics('all')).rejects.toBeDefined();
      consoleSpy.mockRestore();
    });

    it('should update isFetching state during request', async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      server.use(
        http.get(`${mockBaseUrl}/analysis/kpi/cve`, async () => {
          await requestPromise;
          return HttpResponse.json(mockKpiMetrics);
        }),
      );

      const fetchPromise = service.getKpiMetrics('all');
      expect(service.isFetching.value).toBe(true);

      resolveRequest!(null);
      await fetchPromise;

      expect(service.isFetching.value).toBe(false);
    });
  });

  describe('getBotKpiMetrics', () => {
    let accessToken: string;

    beforeEach(() => {
      accessToken = encodeJWT({ exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1337 });
      useAuthStore().accessToken = accessToken;
    });

    const finalFeatures: AegisBotKpiPage['features'] = {
      impact: {
        acceptance_rate: 100,
        avg_confidence: 0.9,
        avg_data_quality: 0.8,
        avg_suggestion_deviation: 0,
        kept: 2,
        modified: 0,
        skipped: 1,
        suggested: 3,
      },
    };

    // Serves pages keyed by the cursor that requests them ('' for the first
    // page) and records every request URL for parameter assertions.
    function serveBotPages(pagesByCursor: Record<string, AegisBotKpiPage>) {
      const requests: URL[] = [];
      server.use(http.get(`${mockBaseUrl}/analysis/kpi/osidb-bot`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = pagesByCursor[url.searchParams.get('cursor') ?? ''];
        if (!page) return HttpResponse.json({ detail: 'unexpected cursor' }, { status: 400 });
        return HttpResponse.json(page);
      }));
      return requests;
    }

    // Serves a supersession scenario: the first fetch (component "kernel") has
    // its opening page held until released and must never reach its second
    // page, while a replacement fetch (component "openssl") paginates freely.
    // Returns the recorded request URLs and the release control.
    function serveSupersededBotPages() {
      const requests: URL[] = [];
      let releaseSupersededPage!: () => void;
      const supersededPageGate = new Promise<void>((resolve) => { releaseSupersededPage = resolve; });
      server.use(http.get(`${mockBaseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        if (url.searchParams.get('component') === 'kernel') {
          if (url.searchParams.has('cursor')) {
            return HttpResponse.json({ detail: 'superseded page 2 must not be requested' }, { status: 400 });
          }
          await supersededPageGate;
          return HttpResponse.json({
            entries: [botEntry('CVE-2026-0001')],
            features: {},
            next_cursor: 'CVE-2026-0002',
            progress: { complete: false, refreshed_flaws: 1, selected_flaws: 4 },
            total_flaws_processed: 0,
          });
        }
        if (url.searchParams.get('cursor') === 'CVE-2026-0102') {
          return HttpResponse.json({
            available_components: ['openssl'],
            entries: [botEntry('CVE-2026-0103')],
            features: finalFeatures,
            progress: { complete: true, refreshed_flaws: 4, selected_flaws: 4 },
            total_flaws_processed: 4,
          });
        }
        return HttpResponse.json({
          entries: [botEntry('CVE-2026-0101'), botEntry('CVE-2026-0102')],
          features: {},
          next_cursor: 'CVE-2026-0102',
          progress: { complete: false, refreshed_flaws: 2, selected_flaws: 4 },
          total_flaws_processed: 0,
        });
      }));
      return { releaseSupersededPage, requests };
    }

    it('requests 400-flaw pages by cursor, accumulating every entry into the final aggregate', async () => {
      const requests = serveBotPages({
        '': {
          entries: [botEntry('CVE-2026-0001'), botEntry('CVE-2026-0002')],
          features: {},
          next_cursor: 'CVE-2026-0003',
          progress: { complete: false, refreshed_flaws: 2, selected_flaws: 5 },
          total_flaws_processed: 0,
        },
        'CVE-2026-0003': {
          entries: [botEntry('CVE-2026-0003'), botEntry('CVE-2026-0004')],
          features: {},
          next_cursor: 'CVE-2026-0005',
          progress: { complete: false, refreshed_flaws: 4, selected_flaws: 5 },
          total_flaws_processed: 0,
        },
        'CVE-2026-0005': {
          available_components: ['kernel', 'openssl'],
          entries: [botEntry('CVE-2026-0005')],
          features: finalFeatures,
          progress: { complete: true, refreshed_flaws: 5, selected_flaws: 5 },
          total_flaws_processed: 5,
        },
      });
      const onBotKpiProgress = vi.fn();
      service.onBotKpiProgress = onBotKpiProgress;

      const result = await service.getBotKpiMetrics({
        aegis_version: ['0.9.2'],
        component: 'kernel',
        recorded_after: '2026-09-01T00:00:00Z',
        recorded_before: '2026-09-30T23:59:59.999Z',
      });

      expect(requests).toHaveLength(3);
      expect(requests[0].searchParams.has('cursor')).toBe(false);
      for (const url of requests) {
        expect(url.searchParams.get('detail')).toBe('true');
        expect(url.searchParams.get('limit')).toBe('400');
        expect(url.searchParams.get('component')).toBe('kernel');
        expect(url.searchParams.getAll('aegis_version')).toEqual(['0.9.2']);
        expect(url.searchParams.get('recorded_after')).toBe('2026-09-01T00:00:00Z');
        expect(url.searchParams.get('recorded_before')).toBe('2026-09-30T23:59:59.999Z');
      }
      expect(requests[1].searchParams.get('cursor')).toBe('CVE-2026-0003');
      expect(requests[2].searchParams.get('cursor')).toBe('CVE-2026-0005');
      expect(result.entries.map(entry => entry.cve_id)).toEqual([
        'CVE-2026-0001', 'CVE-2026-0002', 'CVE-2026-0003', 'CVE-2026-0004', 'CVE-2026-0005',
      ]);
      expect(result.features).toEqual(finalFeatures);
      expect(result.total_flaws_processed).toBe(5);
      expect(result.available_components).toEqual(['kernel', 'openssl']);
      expect(onBotKpiProgress.mock.calls).toEqual([[2, 5], [4, 5], [5, 5]]);
    });

    it('does not invoke the progress hook for pages without a progress block', async () => {
      serveBotPages({
        '': {
          entries: [botEntry('CVE-2026-0001')],
          features: {},
          next_cursor: 'CVE-2026-0002',
          progress: { complete: false, refreshed_flaws: 1, selected_flaws: 2 },
          total_flaws_processed: 0,
        },
        'CVE-2026-0002': {
          entries: [botEntry('CVE-2026-0002')],
          features: finalFeatures,
          total_flaws_processed: 2,
        },
      });
      const onBotKpiProgress = vi.fn();
      service.onBotKpiProgress = onBotKpiProgress;

      await service.getBotKpiMetrics();

      expect(onBotKpiProgress.mock.calls).toEqual([[1, 2]]);
    });

    it('returns a legacy single-page response unchanged without progress reporting', async () => {
      const legacy = {
        available_components: ['kernel'],
        entries: [botEntry('CVE-2026-0001')],
        features: finalFeatures,
        total_flaws_processed: 1,
      };
      const requests = serveBotPages({ '': legacy });
      const onBotKpiProgress = vi.fn();
      service.onBotKpiProgress = onBotKpiProgress;

      await expect(service.getBotKpiMetrics()).resolves.toEqual(legacy);
      expect(requests).toHaveLength(1);
      expect(requests[0].searchParams.has('cursor')).toBe(false);
      expect(onBotKpiProgress).not.toHaveBeenCalled();
    });

    it.each([
      { available_components: null, name: 'null' },
      { available_components: undefined, name: 'absent' },
    ])('maps a final page whose available_components is $name to undefined', async ({ available_components }) => {
      const finalPage: AegisBotKpiPage = {
        entries: [botEntry('CVE-2026-0002')],
        features: finalFeatures,
        next_cursor: null,
        total_flaws_processed: 2,
      };
      if (available_components !== undefined) finalPage.available_components = available_components;
      serveBotPages({
        '': {
          entries: [botEntry('CVE-2026-0001')],
          features: {},
          next_cursor: 'CVE-2026-0002',
          total_flaws_processed: 0,
        },
        'CVE-2026-0002': finalPage,
      });

      const result = await service.getBotKpiMetrics();

      expect(result.available_components).toBeUndefined();
      expect(result).toEqual({
        entries: [botEntry('CVE-2026-0001'), botEntry('CVE-2026-0002')],
        features: finalFeatures,
        total_flaws_processed: 2,
      });
    });

    it('stops following a server that never finishes paginating', async () => {
      const requests: Request[] = [];
      server.use(http.get(`${mockBaseUrl}/analysis/kpi/osidb-bot`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          entries: [botEntry('CVE-2026-0001')],
          features: {},
          next_cursor: 'CVE-2026-0002',
          total_flaws_processed: 0,
        });
      }));

      await expect(service.getBotKpiMetrics()).rejects.toThrow(
        'osidb-bot KPI pagination did not complete after 200 pages.',
      );
      expect(requests).toHaveLength(200);
    });

    it('propagates a failure on a later page instead of returning partial results', async () => {
      server.use(http.get(`${mockBaseUrl}/analysis/kpi/osidb-bot`, ({ request }) =>
        new URL(request.url).searchParams.has('cursor')
          ? HttpResponse.json({ detail: 'Cold cache refresh failed' }, { status: 500 })
          : HttpResponse.json({
            entries: [botEntry('CVE-2026-0001')],
            features: {},
            next_cursor: 'CVE-2026-0002',
            progress: { complete: false, refreshed_flaws: 1, selected_flaws: 2 },
            total_flaws_processed: 0,
          })));

      await expect(service.getBotKpiMetrics()).rejects.toMatchObject({
        message: expect.stringContaining('Cold cache refresh failed'),
        response: { status: 500 },
      });
      expect(service.isFetching.value).toBe(false);
    });

    it('supersedes in-flight pagination when a newer fetch starts on the same service', async () => {
      const { releaseSupersededPage, requests } = serveSupersededBotPages();

      const superseded = service.getBotKpiMetrics({ component: 'kernel' });
      await vi.waitFor(() => expect(requests).toHaveLength(1));
      const replacement = service.getBotKpiMetrics({ component: 'openssl' });

      await expect(replacement).resolves.toEqual({
        available_components: ['openssl'],
        entries: [botEntry('CVE-2026-0101'), botEntry('CVE-2026-0102'), botEntry('CVE-2026-0103')],
        features: finalFeatures,
        total_flaws_processed: 4,
      });
      expect(requests.filter(url => url.searchParams.get('component') === 'openssl')).toHaveLength(2);

      releaseSupersededPage();
      await expect(superseded).rejects.toThrow(
        'osidb-bot KPI fetch was superseded by a newer request.',
      );
      expect(requests.filter(url => url.searchParams.get('component') === 'kernel')).toHaveLength(1);
      expect(service.isFetching.value).toBe(false);
    });

    it('keeps a superseded fetch reporting progress to the callback captured when it started', async () => {
      const { releaseSupersededPage, requests } = serveSupersededBotPages();
      const firstHook = vi.fn();
      const secondHook = vi.fn();
      service.onBotKpiProgress = firstHook;

      const superseded = service.getBotKpiMetrics({ component: 'kernel' });
      await vi.waitFor(() => expect(requests).toHaveLength(1));
      service.onBotKpiProgress = secondHook;
      const replacement = service.getBotKpiMetrics({ component: 'openssl' });

      await expect(replacement).resolves.toMatchObject({ total_flaws_processed: 4 });
      releaseSupersededPage();
      await expect(superseded).rejects.toThrow('superseded by a newer request');

      expect(firstHook.mock.calls).toEqual([[1, 4]]);
      expect(secondHook.mock.calls).toEqual([[2, 4], [4, 4]]);
    });

    it('completes a later paginated fetch normally after an earlier one finished', async () => {
      const requests = serveBotPages({
        '': {
          entries: [botEntry('CVE-2026-0001')],
          features: {},
          next_cursor: 'CVE-2026-0002',
          progress: { complete: false, refreshed_flaws: 1, selected_flaws: 2 },
          total_flaws_processed: 0,
        },
        'CVE-2026-0002': {
          available_components: ['kernel'],
          entries: [botEntry('CVE-2026-0002')],
          features: finalFeatures,
          total_flaws_processed: 2,
        },
      });
      const onBotKpiProgress = vi.fn();
      service.onBotKpiProgress = onBotKpiProgress;

      const first = await service.getBotKpiMetrics();
      const second = await service.getBotKpiMetrics();

      expect(first).toEqual(second);
      expect(second).toEqual({
        available_components: ['kernel'],
        entries: [botEntry('CVE-2026-0001'), botEntry('CVE-2026-0002')],
        features: finalFeatures,
        total_flaws_processed: 2,
      });
      expect(requests).toHaveLength(4);
      expect(onBotKpiProgress.mock.calls).toEqual([[1, 2], [1, 2]]);
    });
  });

  describe('kpi authentication', () => {
    const initialTime = new Date('2026-10-01T12:00:00Z');
    const botMetrics = { entries: [], features: {}, total_flaws_processed: 0 };
    const cveMetrics = { 'suggest-cwe': { acceptance_percentage: 0, entries: [] } };
    let requests: Request[];
    let refreshRequests: Request[];

    function token(expiresInSeconds: number) {
      return encodeJWT({
        token_type: 'access',
        user_id: 1337,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      });
    }

    beforeEach(() => {
      // Leave network timers real while advancing the JWT clock between page loads.
      vi.useFakeTimers({ toFake: ['Date'], now: initialTime });
      requests = [];
      refreshRequests = [];
      server.use(
        http.get(`${mockBaseUrl}/analysis/kpi/osidb-bot`, ({ request }) => {
          requests.push(request);
          return HttpResponse.json(botMetrics);
        }),
        http.get(`${mockBaseUrl}/analysis/kpi/cve`, ({ request }) => {
          requests.push(request);
          return HttpResponse.json(cveMetrics);
        }),
        http.get(`${osimRuntime.value.backends.osidb}/auth/token/refresh`, ({ request }) => {
          refreshRequests.push(request);
          return HttpResponse.json({ access: token(3600) });
        }),
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each(['cve', 'osidb-bot'])('reuses a valid JWT for repeated %s requests', async (endpoint) => {
      const accessToken = token(300);
      useAuthStore().accessToken = accessToken;

      for (let index = 0; index < 2; index++) {
        if (endpoint === 'cve') {
          expect(await service.getKpiMetrics('suggest-cwe')).toEqual(cveMetrics);
        } else {
          expect(await service.getBotKpiMetrics()).toEqual(botMetrics);
        }
      }

      expect(requests).toHaveLength(2);
      expect(refreshRequests).toHaveLength(0);
      for (const request of requests) {
        expect(request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);
        expect(request.credentials).toBe('include');
      }
    });

    it.each([false, true])(
      'refreshes once before parallel filtered requests after expiry (separate services: %s)',
      async (separateServices) => {
        const authStore = useAuthStore();
        const initialToken = token(300);
        authStore.accessToken = initialToken;
        const botService = separateServices ? new AegisAIService() : service;

        await Promise.all([service.getKpiMetrics(), botService.getBotKpiMetrics()]);
        expect(refreshRequests).toHaveLength(0);
        expect(requests.map(request => request.headers.get('Authorization')))
          .toEqual([`Bearer ${initialToken}`, `Bearer ${initialToken}`]);
        requests.length = 0;

        vi.setSystemTime(new Date(initialTime.getTime() + 301_000));
        const refreshedToken = token(3600);
        let releaseRefresh!: () => void;
        const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
        server.use(http.get(`${osimRuntime.value.backends.osidb}/auth/token/refresh`, async ({ request }) => {
          refreshRequests.push(request);
          await refreshGate;
          return HttpResponse.json({ access: refreshedToken });
        }));
        const query = {
          component: 'kernel & core',
          aegis_version: ['0.9.2+build1', ''],
          recorded_after: '2026-09-01T00:00:00Z',
          recorded_before: '2026-09-30T23:59:59.999Z',
        };

        const pending = Promise.all([
          service.getKpiMetrics('suggest-cwe', { ...query, detail: true }),
          botService.getBotKpiMetrics(query),
        ]);
        try {
          await vi.waitFor(() => expect(refreshRequests).toHaveLength(1));
          expect(requests).toHaveLength(0);
          expect(service.isFetching.value).toBe(true);
          expect(botService.isFetching.value).toBe(true);
        } finally {
          releaseRefresh();
        }
        expect(await pending).toEqual([cveMetrics, botMetrics]);

        expect(refreshRequests).toHaveLength(1);
        expect(refreshRequests[0].credentials).toBe('include');
        expect(authStore.accessToken).toBe(refreshedToken);
        expect(requests).toHaveLength(2);
        for (const request of requests) {
          expect(request.headers.get('Authorization')).toBe(`Bearer ${refreshedToken}`);
          expect(request.credentials).toBe('include');
          const url = new URL(request.url);
          expect(url.searchParams.get('component')).toBe(query.component);
          expect(url.searchParams.getAll('aegis_version')).toEqual(query.aegis_version);
          expect(url.searchParams.get('recorded_after')).toBe(query.recorded_after);
          expect(url.searchParams.get('recorded_before')).toBe(query.recorded_before);
          expect(url.searchParams.get('detail')).toBe('true');
          if (url.pathname.endsWith('/cve')) {
            expect(url.searchParams.get('feature')).toBe('suggest-cwe');
          }
        }
        expect(service.isFetching.value).toBe(false);
        expect(botService.isFetching.value).toBe(false);
      },
    );

    it.each(['cve', 'osidb-bot'])('acquires a JWT for %s when no access token is cached', async (endpoint) => {
      expect(useAuthStore().accessToken).toBeFalsy();

      if (endpoint === 'cve') {
        await service.getKpiMetrics();
      } else {
        await service.getBotKpiMetrics();
      }

      expect(refreshRequests).toHaveLength(1);
      expect(requests).toHaveLength(1);
      expect(requests[0].headers.get('Authorization')).toBe(`Bearer ${useAuthStore().accessToken}`);
      expect(requests[0].credentials).toBe('include');
    });

    it('refreshes a JWT inside the existing sixty-second safety window', async () => {
      const nearExpiryToken = token(30);
      useAuthStore().accessToken = nearExpiryToken;

      await Promise.all([service.getKpiMetrics(), service.getBotKpiMetrics()]);

      expect(refreshRequests).toHaveLength(1);
      expect(requests).toHaveLength(2);
      for (const request of requests) {
        expect(request.headers.get('Authorization')).toBe(`Bearer ${useAuthStore().accessToken}`);
        expect(request.headers.get('Authorization')).not.toBe(`Bearer ${nearExpiryToken}`);
      }
    });

    it('blocks both KPI calls on rejected refresh, clears loading, and can refresh on a later attempt', async () => {
      const authStore = useAuthStore();
      authStore.accessToken = token(-300);
      const botService = new AegisAIService();
      // Retain logout's state reset without navigating the test application.
      const logoutSpy = vi.spyOn(authStore, 'logout').mockImplementation(async () => { authStore.$reset(); });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let releaseRefresh!: () => void;
      const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
      server.use(http.get(`${osimRuntime.value.backends.osidb}/auth/token/refresh`, async ({ request }) => {
        refreshRequests.push(request);
        await refreshGate;
        return HttpResponse.json({ detail: 'Session expired' }, { status: 401 });
      }));

      try {
        const pending = Promise.allSettled([service.getKpiMetrics(), botService.getBotKpiMetrics()]);
        try {
          await vi.waitFor(() => expect(refreshRequests).toHaveLength(1));
          expect(service.isFetching.value).toBe(true);
          expect(botService.isFetching.value).toBe(true);
          expect(requests).toHaveLength(0);
        } finally {
          releaseRefresh();
        }
        const results = await pending;
        for (const result of results) {
          expect(result).toMatchObject({
            status: 'rejected', reason: { message: 'Unable to refresh access token' },
          });
        }
        expect(refreshRequests).toHaveLength(1);
        expect(requests).toHaveLength(0);
        expect(service.isFetching.value).toBe(false);
        expect(botService.isFetching.value).toBe(false);

        const recoveredToken = token(3600);
        server.use(http.get(`${osimRuntime.value.backends.osidb}/auth/token/refresh`, ({ request }) => {
          refreshRequests.push(request);
          return HttpResponse.json({ access: recoveredToken });
        }));
        expect(await Promise.all([service.getKpiMetrics(), botService.getBotKpiMetrics()]))
          .toEqual([cveMetrics, botMetrics]);
        expect(refreshRequests).toHaveLength(2);
        expect(requests).toHaveLength(2);
        for (const request of requests) {
          expect(request.headers.get('Authorization')).toBe(`Bearer ${recoveredToken}`);
        }
        expect(service.isFetching.value).toBe(false);
        expect(botService.isFetching.value).toBe(false);
      } finally {
        logoutSpy.mockRestore();
        consoleSpy.mockRestore();
      }
    });

    it('leaves non-KPI analysis requests independent of expired OSIDB auth', async () => {
      useAuthStore().accessToken = token(-300);
      const analysis = { impact: 'IMPORTANT' };
      let analysisRequest: Request | undefined;
      server.use(http.get(`${mockBaseUrl}/analysis/cve`, ({ request }) => {
        analysisRequest = request;
        return HttpResponse.json(analysis);
      }));

      expect(await service.analyzeCVE({ feature: 'suggest-impact', cve_id: 'CVE-2026-1234' }))
        .toEqual(analysis);
      expect(analysisRequest?.headers.has('Authorization')).toBe(false);
      expect(analysisRequest?.credentials).toBe('include');
      expect(refreshRequests).toHaveLength(0);
      expect(requests).toHaveLength(0);
    });
  });
});
