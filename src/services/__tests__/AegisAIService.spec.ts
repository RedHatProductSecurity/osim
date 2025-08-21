import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

import { osimRuntime } from '@/stores/osimRuntime';
import { server } from '@/__tests__/setup';
import type {
  AegisAICVEAnalysisParamsType,
  AegisAIComponentAnalysisParamsType,
  AegisAICVEAnalysisWithContextParamsType,
} from '@/types/zodAegisAI';

import { AegisAIService } from '../AegisAIService';

// Mock the stores
vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
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
      const params: AegisAICVEAnalysisWithContextParamsType = {
        feature: 'suggest-cwe',
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
      const params: AegisAICVEAnalysisWithContextParamsType = {
        feature: 'suggest-impact',
        cve_id: 'CVE-2024-invalid',
      };

      server.use(
        http.post(`${mockBaseUrl}/analysis/cve/suggest-impact`, () =>
          HttpResponse.json({ error: 'Invalid CVE format' }, { status: 400 }),
        ),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.analyzeCVEWithContext(params)).rejects.toBeDefined();
      consoleSpy.mockRestore();
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
});
