import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OsimRuntime } from '@/types/zodOsim';

const toMs = (time: [number, number]) => time[0] * 1000 + time[1] / 1e6;
const exporter = vi.hoisted(() => ({ spans: [] as any[], urls: [] as string[] }));
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class {
    constructor(options: { url: string }) { exporter.urls.push(options.url); }

    export(spans: any[], callback: (result: { code: number }) => void) {
      exporter.spans.push(...spans.map(span => ({
        name: span.name, attributes: span.attributes, startTime: span.startTime, duration: span.duration,
      })));
      callback({ code: 0 });
    }

    shutdown() { return Promise.resolve(); }
  },
}));

const runtime = OsimRuntime.parse({
  env: 'test',
  backends: {
    osidb: 'http://osidb', bugzilla: '', jira: '', errata: '', jiraDisplay: '', mitre: '',
  },
  osimVersion: { rev: 'abc123', tag: 'test', timestamp: '2024-01-01T00:00:00Z' },
  telemetry: { otlpEndpoint: 'https://collector.example/v1/traces', sampleRate: 1 },
});

describe('telemetry', () => {
  let originalFetch: typeof window.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  let cleanup: (() => Promise<void>) | undefined;
  let currentProvider: InstanceType<typeof import('@opentelemetry/sdk-trace-web').WebTracerProvider> | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalFetch = window.fetch;
    fetchMock = vi.fn().mockResolvedValue(new Response());
    window.fetch = fetchMock as typeof window.fetch;
    exporter.spans.length = 0;
    cleanup = undefined;
  });

  afterEach(async () => {
    await cleanup?.();
    window.fetch = originalFetch;
  });

  async function startTelemetry(config = runtime) {
    const { initializeTelemetry } = await import('../telemetry');
    const { WebTracerProvider } = await import('@opentelemetry/sdk-trace-web');
    const providers: InstanceType<typeof WebTracerProvider>[] = [];
    const register = WebTracerProvider.prototype.register;
    const spy = vi.spyOn(WebTracerProvider.prototype, 'register').mockImplementation(function (
      this: InstanceType<typeof WebTracerProvider>,
    ) {
      providers.push(this);
      currentProvider = providers.at(-1);
      return register.call(this);
    });
    const windowListeners: [string, EventListenerOrEventListenerObject,
      AddEventListenerOptions | boolean | undefined][] = [];
    const add = window.addEventListener;
    const listenerSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      windowListeners.push([type, listener, options]);
      return add.call(window, type, listener, options);
    });
    try {
      initializeTelemetry(config);
    } finally {
      spy.mockRestore();
      listenerSpy.mockRestore();
    }
    cleanup = async () => {
      windowListeners.forEach(([type, listener, options]) => window.removeEventListener(type, listener, options));
      for (const provider of providers) await provider.shutdown();
    };
  }
  it('accepts the disabled runtime payload and does not load the exporter', async () => {
    const disabled = OsimRuntime.parse({ ...runtime, telemetry: null });
    const { initializeTelemetry } = await import('../telemetry');
    exporter.urls.length = 0;
    initializeTelemetry(disabled);
    expect(exporter.urls).toHaveLength(0);
  });

  it('records sampled navigation and errors with route context', async () => {
    const { recordError, recordNavigation, recordVueError } = await import('../telemetry');
    await startTelemetry();
    recordNavigation('/flaws/123', 100, 123);
    recordError('browser.error', 'secret-from-browser-error');
    recordVueError(new Error('secret-from-vue-error'));
    document.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => {
      expect(exporter.spans.some(span => span.name === 'ui.navigation')).toBe(true);
    }, { timeout: 3000 });
    const navigation = exporter.spans.find(span => span.name === 'ui.navigation');
    expect(navigation.attributes['http.route']).toBe('/flaws/123');
    expect(navigation.attributes['navigation.duration_ms']).toBe(23);
    expect(toMs(navigation.startTime)).toBeCloseTo(performance.timeOrigin + 100, 0);
    expect(toMs(navigation.duration)).toBeCloseTo(23, 0);
    expect(exporter.spans.some(span => span.name === 'browser.error'
    && span.attributes['exception.message'] === 'Browser error')).toBe(true);
    expect(exporter.spans.some(span => span.name === 'vue.error'
    && span.attributes['exception.message'] === 'Vue application error')).toBe(true);
    expect(JSON.stringify(exporter.spans)).not.toContain('secret-from-');
  });

  it('uses the navigation entry offsets for the page-load span', async () => {
    const timing = vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{
      name: `${window.location.origin}/flaws/secret-id?token=secret-value`,
      startTime: 12,
      loadEventEnd: 42,
    } as PerformanceNavigationTiming]);
    try {
      await startTelemetry();
      await currentProvider?.forceFlush();
      const span = exporter.spans.find(item => item.name === 'page.load');
      expect(span.attributes['http.route']).toBe('/flaws/:id');
      expect(span.attributes['page.load.duration_ms']).toBe(42);
      expect(toMs(span.startTime)).toBeCloseTo(performance.timeOrigin + 12, 0);
      expect(toMs(span.duration)).toBeCloseTo(30, 0);
    } finally {
      timing.mockRestore();
    }
  });

  it('captures non-bubbling resource errors', async () => {
    await startTelemetry();
    exporter.spans.length = 0;
    const resource = document.createElement('img');
    document.body.append(resource);
    resource.dispatchEvent(new Event('error'));
    document.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => {
      expect(exporter.spans.some(span => span.name === 'browser.error')).toBe(true);
    }, { timeout: 3000 });
    resource.remove();
  });

  it('accepts the proxy endpoint and resolves it against the browser origin', async () => {
    const proxyRuntime = OsimRuntime.parse({
      ...runtime,
      telemetry: { otlpEndpoint: '/proxy/otlp/v1/traces', sampleRate: 0 },
    });
    await startTelemetry(proxyRuntime);
    expect(exporter.urls.at(-1)).toBe(`${window.location.origin}/proxy/otlp/v1/traces`);
    expect(OsimRuntime.safeParse({ ...runtime, telemetry: { otlpEndpoint: '/proxy/other' } }).success).toBe(false);
    expect(OsimRuntime.safeParse({ ...runtime, telemetry: { otlpEndpoint: 'ftp://collector.test' } }).success).toBe(false);
  });

  it('does not clone or buffer responses for unsampled fetches', async () => {
    await startTelemetry(OsimRuntime.parse({
      ...runtime,
      telemetry: { otlpEndpoint: '/proxy/otlp/v1/traces', sampleRate: 0 },
    }));
    const response = new Response('large response');
    const clone = vi.spyOn(response, 'clone');
    fetchMock.mockResolvedValueOnce(response);
    const result = await window.fetch('/flaws/secret-id?token=secret-value');
    expect(result).toBe(response);
    expect(clone).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await currentProvider?.forceFlush();
    expect(exporter.spans).toHaveLength(0);
  });

  it.each([0, 1])('reads an accessor-backed fetch method once at sample rate %s', async (sampleRate) => {
    await startTelemetry(OsimRuntime.parse({
      ...runtime,
      telemetry: { otlpEndpoint: '/proxy/otlp/v1/traces', sampleRate },
    }));
    const method = vi.fn().mockReturnValue('PATCH');
    const init = Object.defineProperty(Object.create({ headers: { 'X-Test': 'inherited' } }),
      'method', { get: method, enumerable: true }) as RequestInit;
    await window.fetch('/flaws/123', init);
    expect(method).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/flaws/123', init);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'X-Test': 'inherited' });
    await currentProvider?.forceFlush();
    expect(exporter.spans.some(span => span.name === 'HTTP PATCH')).toBe(Boolean(sampleRate));
  });

  it('rejects asynchronously when native fetch throws', async () => {
    await startTelemetry();
    const error = new TypeError('invalid request');
    fetchMock.mockImplementationOnce(() => { throw error; });
    const result = window.fetch('/flaws/123');
    await expect(result).rejects.toBe(error);
    await currentProvider?.forceFlush();
    expect(exporter.spans.some(span => span.name === 'HTTP GET')).toBe(true);
  });

  it('rejects asynchronously when the fetch method getter throws', async () => {
    await startTelemetry();
    const error = new Error('broken method getter');
    const init = Object.defineProperty({}, 'method', { get: () => { throw error; }, enumerable: true });
    const result = window.fetch('/flaws/123', init);
    await expect(result).rejects.toBe(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redacts URL values and entity IDs on fetch spans', async () => {
    await startTelemetry();
    const fetchUrl = `${window.location.origin}/osidb/api/v2/flaws/secret-id?token=secret-value`;
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await window.fetch(new Request(fetchUrl));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => expect(exporter.spans.some(span => span.name === 'HTTP GET')).toBe(true), { timeout: 3000 });
    const fetchSpan = exporter.spans.find(span => span.name === 'HTTP GET');
    expect(fetchSpan.attributes['http.response.status_code']).toBe(404);
    expect(JSON.stringify(fetchSpan)).not.toMatch(/secret-id|secret-value/);
  });

  it('exports Jira route templates and omits unknown paths', async () => {
    await startTelemetry();
    const paths = [
      '/rest/api/3/issue/SECRET-123/comment/456?token=secret',
      '/rest/api/3/issue/SECRET-123/transitions?token=secret',
      '/other/private-123?token=secret',
    ];
    await Promise.all(paths.map(path => window.fetch(`${window.location.origin}${path}`)));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    document.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => expect(exporter.spans.filter(span => span.name === 'HTTP GET')).toHaveLength(3),
      { timeout: 3000 });
    const spans = exporter.spans.filter(span => span.name === 'HTTP GET');
    expect(spans[0].attributes['http.url']).toContain('/rest/api/3/issue/:id/comment/:id');
    expect(spans[1].attributes['http.url']).toContain('/rest/api/3/issue/:id/transitions');
    expect(spans[2].attributes['http.url']).toBe(`${window.location.origin}/other`);
    expect(JSON.stringify(spans)).not.toMatch(/SECRET-123|private-123|token=secret/);
    await window.fetch('data:text/plain,secret-payload');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
