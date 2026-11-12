import { flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

import { encodeJWT } from '@/__tests__/helpers';
import { deferred, deliveryEntry, deliveryFeatures, deliveryPage } from '@/__tests__/kpiDeliveryFixtures';
import { server } from '@/__tests__/setup';
import { AegisAIService } from '@/services/AegisAIService';
import { useAuthStore } from '@/stores/AuthStore';
import { osimRuntime } from '@/stores/osimRuntime';
import type { AegisBotKpiPage } from '@/types/aegisAI';

const baseUrl = 'http://localhost:8080';
const botUrl = `${baseUrl}/analysis/kpi/osidb-bot`;
const legacy = { entries: [], features: {}, total_flaws_processed: 0 };

function servePages(pages: AegisBotKpiPage[]) {
  const requests: Request[] = [];
  server.use(http.get(botUrl, ({ request }) => {
    requests.push(request);
    return HttpResponse.json(pages[requests.length - 1]);
  }));
  return requests;
}

describe('kPI delivery service over HTTP', () => {
  let service: AegisAIService;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    setActivePinia(createPinia());
    useAuthStore().accessToken = encodeJWT({ exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1337 });
    // @ts-expect-error Runtime configuration is read-only outside tests.
    osimRuntime.value.backends.aegisai = baseUrl;
    service = new AegisAIService();
  });
  afterEach(() => {
    vi.useRealTimers();
    consoleError.mockRestore();
  });

  it('counts delivery independently of cache freshness and entries, replacing cumulative aggregates', async () => {
    const entries = [deliveryEntry('CVE-2026-1000'), deliveryEntry('CVE-2026-1000', 'cwe')];
    const metadata = deliveryPage('metadata', 0, 10, 'opaque/+?=first');
    metadata.progress = { complete: false, refreshed_flaws: 9, selected_flaws: 10 };
    const first = { ...deliveryPage('first', 1, 10, 'opaque/+?=empty', entries),
      features: deliveryFeatures,
      total_flaws_processed: 1 };
    const empty = { ...deliveryPage('empty', 2, 10, 'opaque/+?=last'),
      features: deliveryFeatures,
      total_flaws_processed: 2 };
    const final = { ...deliveryPage('last', 10, 10, null, [deliveryEntry('CVE-2026-1001')]),
      features: { impact: { ...deliveryFeatures.impact, suggested: 3, avg_data_quality: 0.55 } },
      total_flaws_processed: 7 };
    const requests = servePages([metadata, first, empty, final]);
    const onSnapshot = vi.fn();
    const originalHook = vi.fn();
    const replacementHook = vi.fn();
    service.onBotKpiProgress = originalHook;
    const pending = service.getBotKpiMetrics({ component: 'kernel' }, { onSnapshot });
    service.onBotKpiProgress = replacementHook;
    const result = await pending;

    expect(originalHook.mock.calls).toEqual([[0, 10], [1, 10], [2, 10], [10, 10]]);
    expect(replacementHook).not.toHaveBeenCalled();
    const snapshots = onSnapshot.mock.calls.map(([metrics]) => metrics);
    expect(snapshots.map(metrics => metrics.entries.length)).toEqual([0, 2, 2, 3]);
    expect(snapshots.map(metrics => metrics.total_flaws_processed)).toEqual([0, 1, 2, 7]);
    expect(snapshots[1].features).toEqual(deliveryFeatures);
    expect(snapshots[2].features).toEqual(deliveryFeatures);
    expect(result.features).toEqual(final.features);
    expect(result.entries).toEqual([...entries, deliveryEntry('CVE-2026-1001')]);
    expect(snapshots[0].entries).toEqual([]);
    expect(snapshots[1].entries).toEqual(entries);
    expect(requests.map(request => new URL(request.url).searchParams.get('cursor')))
      .toEqual([null, 'opaque/+?=first', 'opaque/+?=empty', 'opaque/+?=last']);
    for (const [index, request] of requests.entries()) {
      const params = new URL(request.url).searchParams;
      expect(params.get('run_id')).toBe(index === 0 ? null : 'stable-run');
      expect(params.get('delivery')).toBe('true');
      expect(params.get('detail')).toBe('true');
      expect(params.get('limit')).toBe('400');
      expect(params.get('component')).toBe('kernel');
      expect(params.has('max_refresh_secs')).toBe(false);
      expect(request.cache).toBe('no-store');
    }
  });

  it('does not append entries, replace aggregates, or publish progress twice for a replayed page', async () => {
    const first = { ...deliveryPage('first', 1, 2, 'cursor-2', [deliveryEntry('CVE-2026-1000')]),
      features: deliveryFeatures,
      total_flaws_processed: 1 };
    const requests = servePages([first, first, deliveryPage('last', 2, 2, null, [deliveryEntry('CVE-2026-1001')])]);
    const onSnapshot = vi.fn();
    service.onBotKpiProgress = vi.fn();
    const result = await service.getBotKpiMetrics({}, { onSnapshot });
    expect(result.entries).toHaveLength(2);
    expect(onSnapshot).toHaveBeenCalledTimes(2);
    expect(service.onBotKpiProgress).toHaveBeenCalledTimes(2);
    expect(requests).toHaveLength(3);
    expect(new URL(requests[2].url).searchParams.get('cursor')).toBe('cursor-2');
    expect(onSnapshot.mock.calls[0][0].features).toEqual(deliveryFeatures);
  });

  it.each([
    ['different run', { run_id: 'another-run' }],
    ['changed selection', { selected_flaws: 5 }],
    ['regressed count', { received_flaws: 0 }],
    ['fractional count', { received_flaws: 1.5 }],
    ['count exceeds selection', { received_flaws: 4 }],
    ['missing page identity', { page_id: '' }],
    ['completed partial selection', { complete: true }],
  ])('rejects %s without publishing the corrupt snapshot', async (_name, change) => {
    const first = deliveryPage('first', 1, 3, 'cursor-2', [deliveryEntry('CVE-2026-1000')]);
    const second = deliveryPage('second', 2, 3, 'cursor-3');
    second.delivery = { ...second.delivery!, ...change };
    const requests = servePages([first, second]);
    const onSnapshot = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).rejects.toThrow(/inconsistent/);
    expect(requests).toHaveLength(2);
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      entries: first.entries, delivery: first.delivery,
    }));
  });

  it.each(['disappeared', 'changed replay', 'contradictory continuation'])(
    'rejects %s metadata and retains last valid snapshot', async (scenario) => {
      const first = deliveryPage('first', 1, 3, 'cursor-2', [deliveryEntry('CVE-2026-1000')]);
      const second = deliveryPage('second', 2, 3, 'cursor-3');
      if (scenario === 'disappeared') delete second.delivery;
      if (scenario === 'changed replay') second.delivery!.page_id = 'first';
      if (scenario === 'contradictory continuation') second.next_cursor = null;
      servePages([first, second]);
      const onSnapshot = vi.fn();
      await expect(service.getBotKpiMetrics({}, { onSnapshot })).rejects.toThrow(/Refresh/);
      expect(onSnapshot).toHaveBeenCalledTimes(1);
    },
  );

  it('does not silently switch a legacy paginated response into delivery mode', async () => {
    servePages([{ ...legacy, next_cursor: 'legacy' }, deliveryPage('new-mode', 1, 1, null)]);
    const onSnapshot = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).rejects.toThrow('mode changed');
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ aggregates_available: false }));
  });

  it('finishes an empty selection without NaN or a follow-up page', async () => {
    const requests = servePages([deliveryPage('empty', 0, 0, null)]);
    const onSnapshot = vi.fn();
    service.onBotKpiProgress = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).resolves.toMatchObject({
      entries: [], features: {}, total_flaws_processed: 0, delivery: { complete: true },
    });
    expect(requests).toHaveLength(1);
    expect(service.onBotKpiProgress).toHaveBeenCalledExactlyOnceWith(0, 0);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it.each([409, 410, 500])('retains snapshots on HTTP %s and restarts only on manual request', async (status) => {
    const partial = { ...deliveryPage('partial', 1, 3, 'opaque', [deliveryEntry('CVE-2026-1000')]),
      features: deliveryFeatures,
      total_flaws_processed: 1 };
    const requests: Request[] = [];
    server.use(http.get(botUrl, ({ request }) => {
      requests.push(request);
      return new URL(request.url).searchParams.has('cursor')
        ? HttpResponse.json({ detail: 'Run no longer available' }, { status })
        : HttpResponse.json(partial);
    }));
    const onSnapshot = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).rejects.toMatchObject({ response: { status } });
    expect(requests).toHaveLength(2);
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      delivery: partial.delivery, entries: partial.entries, features: deliveryFeatures, total_flaws_processed: 1,
    }));
    server.use(http.get(botUrl, ({ request }) => {
      requests.push(request);
      expect(new URL(request.url).searchParams.has('run_id')).toBe(false);
      expect(new URL(request.url).searchParams.has('cursor')).toBe(false);
      return HttpResponse.json(deliveryPage('new', 0, 0, null));
    }));
    await expect(service.getBotKpiMetrics()).resolves.toMatchObject({ delivery: { complete: true } });
    expect(requests).toHaveLength(3);
  });

  it('publishes legacy details with unknown delivery and hides placeholder aggregates and cache progress', async () => {
    const first = {
      entries: [deliveryEntry('CVE-2026-1000')],
      features: deliveryFeatures,
      total_flaws_processed: 99,
      next_cursor: 'legacy',
      progress: { complete: false, refreshed_flaws: 90, selected_flaws: 100 } };
    servePages([first, {
      ...legacy, entries: [deliveryEntry('CVE-2026-1001')], features: deliveryFeatures, total_flaws_processed: 2,
    }]);
    const onSnapshot = vi.fn();
    service.onBotKpiProgress = vi.fn();
    const result = await service.getBotKpiMetrics({}, { onSnapshot });
    expect(onSnapshot.mock.calls[0][0]).toMatchObject({
      aggregates_available: false, features: {}, total_flaws_processed: 0, entries: first.entries,
    });
    expect(onSnapshot.mock.calls[0][0].delivery).toBeUndefined();
    expect(service.onBotKpiProgress).not.toHaveBeenCalled();
    expect(result.aggregates_available).not.toBe(false);
    expect(result.total_flaws_processed).toBe(2);
    expect(result.features).toEqual(deliveryFeatures);
    expect(result.entries).toHaveLength(2);
  });

  const outages = [
    { name: 'JSON', respond: () => HttpResponse.json({ detail: 'Service mesh unavailable' }, { status: 503 }) },
    { name: 'text', respond: () => HttpResponse.text('Unavailable', { status: 503 }) },
    { name: 'HTML', respond: () => HttpResponse.html('<h1>Unavailable</h1>', { status: 503 }) },
    { name: 'empty', respond: () => new HttpResponse(null, { status: 503 }) },
  ];
  it.each(['cve', 'osidb-bot'])('retries all unmarked 503 bodies on %s exactly three times', async (endpoint) => {
    for (const outage of outages) {
      const requests: Request[] = [];
      server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
        requests.push(request);
        return outage.respond();
      }));
      const pending = endpoint === 'cve' ? service.getKpiMetrics() : service.getBotKpiMetrics();
      await expect(pending).rejects.toMatchObject({ response: { status: 503 } });
      expect({ body: outage.name, requests: requests.length }).toEqual({ body: outage.name, requests: 4 });
      expect(new Set(requests.map(request => request.url)).size).toBe(1);
      expect(requests.every(request => request.cache === 'no-store')).toBe(true);
    }
  }, 15000);

  it.each(['cve', 'osidb-bot'])('stops on backend exhaustion, auth and other HTTP errors on %s', async (endpoint) => {
    for (const status of [503, 401, 403, 409, 410, 429, 500, 502, 504]) {
      const requests: Request[] = [];
      server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({ detail: 'Unavailable', retry_exhausted: true }, { status });
      }));
      const pending = endpoint === 'cve' ? service.getKpiMetrics() : service.getBotKpiMetrics();
      await expect(pending).rejects.toMatchObject({ response: { status } });
      expect({ status, requests: requests.length }).toEqual({ status, requests: 1 });
    }
  });

  it.each(['cve', 'osidb-bot'])('only trusts a boolean true exhaustion marker on %s', async (endpoint) => {
    const markers = [false, 'true', null];
    const requests: Request[] = [];
    server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
      const index = requests.push(request) - 1;
      return index < markers.length
        ? HttpResponse.json({ retry_exhausted: markers[index] }, { status: 503 })
        : HttpResponse.json(endpoint === 'cve' ? {} : legacy);
    }));
    const pending = endpoint === 'cve' ? service.getKpiMetrics() : service.getBotKpiMetrics();
    await expect(pending).resolves.toEqual(endpoint === 'cve' ? {} : legacy);
    expect(requests).toHaveLength(4);
  });

  it.each(['cve', 'osidb-bot'])('does not retry transport errors on %s', async (endpoint) => {
    const requests: Request[] = [];
    server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
      requests.push(request);
      return HttpResponse.error();
    }));
    const pending = endpoint === 'cve' ? service.getKpiMetrics() : service.getBotKpiMetrics();
    await expect(pending).rejects.toMatchObject({ isNetworkError: true });
    expect(requests).toHaveLength(1);
  });

  it.each(['cve', 'osidb-bot'])('does not send already-aborted %s requests', async (endpoint) => {
    const requests: Request[] = [];
    server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
      requests.push(request);
      return HttpResponse.json(endpoint === 'cve' ? {} : legacy);
    }));
    const controller = new AbortController();
    controller.abort();
    const pending = endpoint === 'cve'
      ? service.getKpiMetrics('all', {}, controller.signal)
      : service.getBotKpiMetrics({}, { signal: controller.signal });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(requests).toEqual([]);
  });

  it('resets the retry budget per page and uses 250/500/1000ms backoffs on the same run and cursor', async () => {
    const requests: Request[] = [];
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    server.use(http.get(botUrl, ({ request }) => {
      requests.push(request);
      if (requests.length % 4 !== 0) return HttpResponse.text('Retry', { status: 503 });
      return HttpResponse.json(new URL(request.url).searchParams.has('cursor')
        ? deliveryPage('last', 1, 1, null, [deliveryEntry('CVE-2026-1000')])
        : deliveryPage('metadata', 0, 1, 'opaque'));
    }));
    try {
      await expect(service.getBotKpiMetrics()).resolves.toMatchObject({ delivery: { received_flaws: 1 } });
      expect(requests).toHaveLength(8);
      expect(timeout.mock.calls.filter(([, ms]) => [250, 500, 1000].includes(Number(ms))).map(([, ms]) => ms))
        .toEqual([250, 500, 1000, 250, 500, 1000]);
      const params = requests.slice(4).map(request => new URL(request.url).searchParams);
      expect(params.every(value => value.get('run_id') === 'stable-run')).toBe(true);
      expect(params.every(value => value.get('cursor') === 'opaque')).toBe(true);
    } finally {
      timeout.mockRestore();
    }
  });

  it.each(['cve', 'osidb-bot'])('aborts pending %s HTTP promptly without a failure snapshot', async (endpoint) => {
    const gate = deferred();
    const requests: Request[] = [];
    server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, async ({ request }) => {
      requests.push(request);
      await gate.promise;
      return HttpResponse.json(endpoint === 'cve' ? {} : legacy);
    }));
    const controller = new AbortController();
    const onSnapshot = vi.fn();
    const pending = endpoint === 'cve'
      ? service.getKpiMetrics('all', {}, controller.signal)
      : service.getBotKpiMetrics({}, { signal: controller.signal, onSnapshot });
    const settled = Promise.allSettled([pending]);
    try {
      await vi.waitFor(() => expect(requests).toHaveLength(1));
      controller.abort();
      expect(requests[0].signal.aborted).toBe(true);
      expect(await settled).toMatchObject([{ status: 'rejected', reason: { name: 'AbortError' } }]);
      expect(onSnapshot).not.toHaveBeenCalled();
    } finally {
      gate.resolve();
    }
  });

  it.each(['cve', 'osidb-bot'])('cancels retry backoff on %s without waiting or another request', async (endpoint) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const requests: Request[] = [];
    server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
      requests.push(request);
      return HttpResponse.text('Unavailable', { status: 503 });
    }));
    const controller = new AbortController();
    const pending = endpoint === 'cve'
      ? service.getKpiMetrics('all', {}, controller.signal)
      : service.getBotKpiMetrics({}, { signal: controller.signal });
    const settled = Promise.allSettled([pending]);
    await flushPromises();
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    controller.abort();
    expect(await settled).toMatchObject([{ status: 'rejected', reason: { name: 'AbortError' } }]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
