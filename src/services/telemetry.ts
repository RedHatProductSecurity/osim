import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, TraceIdRatioBasedSampler, WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import type { OsimRuntimeType } from '@/types/zodOsim';

import { registerTelemetryRecorders } from './telemetryRecorder';

let provider: undefined | WebTracerProvider;
let tracer = trace.getTracer('osim-rum');

// Unknown paths must never leave the browser with IDs or query values.
function sanitizedUrl(raw: string): string {
  const url = new URL(raw, window.location.origin);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return window.location.origin + '/other';
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  const path = url.pathname;
  if (/^\/rest\/api\/3\/issue\/[^/]+(?:\/(?:comment(?:\/[^/]+)?|transitions))?$/.test(path)) {
    url.pathname = path.replace(/(\/rest\/api\/3\/issue\/)[^/]+/, '$1:id')
      .replace(/(\/comment\/)[^/]+/, '$1:id');
  } else if (/^\/flaws\/(?:new|[^/]+)$/.test(path)
  || /^\/osidb\/api\/v[12]\/flaws(?:\/[^/]+)?$/.test(path)
  || (new RegExp('^/osidb/api/v[12]/flaws/[^/]+/' +
  '(?:comments|acknowledgments|references|labels|cvss[_-]scores|package_versions|incident-requests)' +
  '(?:/[^/]+)?$')).test(path)
  || /^\/osidb\/api\/v[12]\/(?:affects|trackers)(?:\/[^/]+(?:\/cvss-scores(?:\/[^/]+)?)?)?$/.test(path)) {
    url.pathname = path
      .replace(/(\/flaws\/)(?!new(?:\/|$))[^/]+/gi, '$1:id')
      .replace(/(\/(?:affects|trackers)\/)[^/]+/gi, '$1:id')
      .replace(/(\/(?:acknowledgments|comments|cvss[_-]scores|labels|references|package_versions)\/)[^/]+/gi,
        '$1:id')
      .replace(/(\/(?:incident-requests|milestones|additional-information-requests|srp-reports)\/)[^/]+/gi,
        '$1:id');
  } else url.pathname = '/other';
  return url.href;
}

export function initializeTelemetry(runtime: OsimRuntimeType): void {
  const endpoint = runtime.telemetry?.otlpEndpoint;
  if (!endpoint || provider) return;

  try {
    const exporterUrl = new URL(endpoint, window.location.origin).href;
    const exporter = new OTLPTraceExporter({ url: exporterUrl });
    provider = new WebTracerProvider({
      sampler: new TraceIdRatioBasedSampler(runtime.telemetry?.sampleRate ?? 0.1),
      spanProcessors: [new BatchSpanProcessor(exporter, {
        maxQueueSize: 128, maxExportBatchSize: 32, scheduledDelayMillis: 1000,
      })],
      resource: new Resource({
        'service.name': 'osim',
        'deployment.environment': runtime.env,
        'service.version': runtime.osimVersion.rev || runtime.osimVersion.tag,
      }),
    });
    provider.register();
    tracer = provider.getTracer('osim-rum');
    // FetchInstrumentation clones and drains every response, including unsampled ones.
    const fetchOriginal = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const raw = input instanceof Request ? input.url : String(input);
      let url: string;
      try {
        url = new URL(raw, document.baseURI).href;
      } catch {
        return fetchOriginal.call(this, input, init);
      }
      if (url === exporterUrl || /\/osidb\/integrations(?:\?|$)/i.test(url)) {
        return fetchOriginal.call(this, input, init);
      }
      let method: string;
      try {
        method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      } catch (error) {
        return Promise.reject(error);
      }
      const safe = new URL(sanitizedUrl(url));
      const span = tracer.startSpan(`HTTP ${method}`, {
        kind: SpanKind.CLIENT,
        attributes: {
          'http.method': method,
          'http.url': safe.href,
          ...(safe.origin === window.location.origin ? { 'http.route': safe.pathname } : {}),
        },
      });
      if (!span.isRecording()) return fetchOriginal.call(this, input, init);
      try {
        return fetchOriginal.call(this, input, init).then((response) => {
          span.setAttribute('http.response.status_code', response.status);
          if (response.status >= 400) span.setStatus({ code: SpanStatusCode.ERROR });
          span.end();
          return response;
        }, (error) => {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.end();
          throw error;
        });
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        return Promise.reject(error);
      }
    };
    registerTelemetryRecorders(recordNavigation, recordVueError);

    const load = () => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!timing?.loadEventEnd) return;
      tracer.startSpan('page.load', {
        attributes: { 'http.route': new URL(sanitizedUrl(timing.name)).pathname,
          'page.load.duration_ms': timing.loadEventEnd },
        startTime: performance.timeOrigin + timing.startTime,
      }).end(performance.timeOrigin + timing.loadEventEnd);
    };
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (timing?.loadEventEnd) load();
    else if (document.readyState === 'complete') setTimeout(load, 0);
    else window.addEventListener('load', () => setTimeout(load, 0), { once: true });

    window.addEventListener('error', () => recordError('browser.error', 'Browser error'), true);
    window.addEventListener('unhandledrejection', () => {
      recordError('browser.unhandled_rejection', 'Unhandled rejection');
    });
  } catch {
    // Telemetry setup is best-effort and must not interfere with app startup.
  }
}

export function recordNavigation(route: string, startedAt: number, completedAt: number): void {
  if (!provider) return;
  tracer.startSpan('ui.navigation', {
    startTime: performance.timeOrigin + startedAt,
    attributes: { 'http.route': route, 'navigation.duration_ms': completedAt - startedAt },
  }).end(performance.timeOrigin + completedAt);
}

export function recordError(name: string, _message: string): void {
  if (!provider) return;
  const category = name === 'browser.unhandled_rejection' ? 'Unhandled rejection' : 'Browser error';
  const span = tracer.startSpan(name, { attributes: { 'exception.message': category } });
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
}

export function recordVueError(_error: unknown, component?: string): void {
  if (!provider) return;
  const span = tracer.startSpan('vue.error', {
    attributes: {
      'exception.message': 'Vue application error',
      ...(component ? { 'vue.component': component.slice(0, 100) } : {}),
    },
  });
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
}
