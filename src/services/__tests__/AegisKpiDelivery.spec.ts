import { flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

import { encodeJWT } from '@/__tests__/helpers';
import { botEntries, botEntry, botFeatures, botPage, deferred } from '@/__tests__/kpiDeliveryFixtures';
import { server } from '@/__tests__/setup';
import { AegisAIService } from '@/services/AegisAIService';
import { useAuthStore } from '@/stores/AuthStore';
import { osimRuntime } from '@/stores/osimRuntime';
import type { AegisBotKpiPage } from '@/types/aegisAI';

const baseUrl = 'http://localhost:8080';
const botUrl = `${baseUrl}/analysis/kpi/osidb-bot`;
const finalPage = botPage([], null);

function servePages(pages: AegisBotKpiPage[]) {
  const requests: Request[] = [];
  server.use(http.get(botUrl, ({ request }) => {
    requests.push(request);
    return HttpResponse.json(pages[requests.length - 1]);
  }));
  return requests;
}

describe('osidb-bot KPI cursor pagination over HTTP', () => {
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

  it('chains cursors into cumulative snapshots and an authoritative final aggregate', async () => {
    const firstEntries = [botEntry('CVE-2026-1000'), botEntry('CVE-2026-1000', 'cwe')];
    const secondEntries = [botEntry('CVE-2026-1001')];
    const lastEntries = [botEntry('CVE-2026-1002')];
    const first = botPage(
      firstEntries,
      'opaque/+?=first',
      { complete: false, refreshed_flaws: 2, selected_flaws: 10 },
    );
    const second = botPage(
      secondEntries,
      'opaque/+?=last',
      { complete: false, refreshed_flaws: 9, selected_flaws: 10 },
    );
    const last = botPage(
      lastEntries,
      null,
      { complete: true, refreshed_flaws: 10, selected_flaws: 10 },
      { available_components: ['kernel'], features: botFeatures, total_flaws_processed: 7 },
    );
    const requests = servePages([first, second, last]);
    const onSnapshot = vi.fn();
    const onBotKpiProgress = vi.fn();
    service.onBotKpiProgress = onBotKpiProgress;

    const result = await service.getBotKpiMetrics({ component: 'kernel' }, { onSnapshot });

    expect(requests.map(request => new URL(request.url).searchParams.get('cursor')))
      .toEqual([null, 'opaque/+?=first', 'opaque/+?=last']);
    for (const request of requests) {
      const params = new URL(request.url).searchParams;
      expect(params.get('detail')).toBe('true');
      expect(params.get('limit')).toBe('400');
      expect(params.get('component')).toBe('kernel');
      expect(params.has('delivery')).toBe(false);
      expect(params.has('run_id')).toBe(false);
      expect(request.cache).toBe('no-store');
    }
    expect(onBotKpiProgress.mock.calls).toEqual([[2, 10], [9, 10], [10, 10]]);
    const snapshots = onSnapshot.mock.calls.map(([metrics]) => metrics);
    expect(snapshots.map(metrics => metrics.entries)).toEqual([
      firstEntries,
      [...firstEntries, ...secondEntries],
      [...firstEntries, ...secondEntries, ...lastEntries],
    ]);
    expect(snapshots[0]).toMatchObject({
      aggregates_available: false,
      features: {},
      progress: { complete: false, refreshed_flaws: 2, selected_flaws: 10 },
      total_flaws_processed: 0,
    });
    expect(snapshots[1]).toMatchObject({
      aggregates_available: false,
      features: {},
      progress: { complete: false, refreshed_flaws: 9, selected_flaws: 10 },
      total_flaws_processed: 0,
    });
    expect(result).toBe(snapshots[2]);
    expect(result).toEqual({
      available_components: ['kernel'],
      entries: [...firstEntries, ...secondEntries, ...lastEntries],
      features: botFeatures,
      progress: { complete: true, refreshed_flaws: 10, selected_flaws: 10 },
      total_flaws_processed: 7,
    });
  });

  it('captures the progress hook when the fetch starts', async () => {
    servePages([
      botPage([], 'cursor-2', { complete: false, refreshed_flaws: 1, selected_flaws: 2 }),
      botPage([], null, null, { features: botFeatures, total_flaws_processed: 1 }),
    ]);
    const originalHook = vi.fn();
    const replacementHook = vi.fn();
    service.onBotKpiProgress = originalHook;
    const pending = service.getBotKpiMetrics({});
    service.onBotKpiProgress = replacementHook;
    await pending;
    expect(originalHook.mock.calls).toEqual([[1, 2]]);
    expect(replacementHook).not.toHaveBeenCalled();
  });

  it('serves a fully cached selection from one pre-pagination response', async () => {
    const requests = servePages([botPage([botEntry('CVE-2026-1000')], null, null, {
      available_components: ['kernel'],
      features: botFeatures,
      total_flaws_processed: 1,
    })]);
    const onSnapshot = vi.fn();
    service.onBotKpiProgress = vi.fn();

    const result = await service.getBotKpiMetrics({}, { onSnapshot });

    expect(result).toEqual({
      available_components: ['kernel'],
      entries: [botEntry('CVE-2026-1000')],
      features: botFeatures,
      total_flaws_processed: 1,
    });
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).searchParams.has('cursor')).toBe(false);
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(result);
    expect(service.onBotKpiProgress).not.toHaveBeenCalled();
  });

  it('completes a fully cached selection served as two warm pages despite complete progress', async () => {
    // A fully warm 2000-flaw selection is served in 1000-flaw pages whatever
    // limit the client requests, and progress.complete is already true on the
    // first page because the whole selection is fresh: only the absent
    // next_cursor of the last page may end the run.
    const warmProgress = { complete: true, refreshed_flaws: 2000, selected_flaws: 2000 };
    const firstEntries = botEntries(1, 1000);
    const lastEntries = botEntries(1001, 1000);
    const first = botPage(firstEntries, 'warm-2', warmProgress);
    const last = botPage(lastEntries, null, warmProgress, {
      available_components: ['kernel'],
      features: botFeatures,
      total_flaws_processed: 2000,
    });
    const requests = servePages([first, last]);
    const onSnapshot = vi.fn();
    const onBotKpiProgress = vi.fn();
    service.onBotKpiProgress = onBotKpiProgress;

    const result = await service.getBotKpiMetrics({}, { onSnapshot });

    expect(requests).toHaveLength(2);
    expect(requests.map(request => new URL(request.url).searchParams.get('cursor')))
      .toEqual([null, 'warm-2']);
    for (const request of requests) {
      expect(new URL(request.url).searchParams.get('limit')).toBe('400');
    }
    const snapshots = onSnapshot.mock.calls.map(([metrics]) => metrics);
    expect(snapshots.map(metrics => metrics.entries)).toEqual([
      firstEntries,
      [...firstEntries, ...lastEntries],
    ]);
    // The complete progress of the first page does not make its snapshot
    // authoritative: only a page without next_cursor carries the aggregate.
    expect(snapshots[0]).toMatchObject({
      aggregates_available: false,
      features: {},
      progress: warmProgress,
      total_flaws_processed: 0,
    });
    expect(result).toBe(snapshots[1]);
    expect(result).toEqual({
      available_components: ['kernel'],
      entries: [...firstEntries, ...lastEntries],
      features: botFeatures,
      progress: warmProgress,
      total_flaws_processed: 2000,
    });
    expect(onBotKpiProgress.mock.calls).toEqual([[2000, 2000], [2000, 2000]]);
  });

  it('follows cursors when refresh-paced pages give way to larger warm remainder pages', async () => {
    // 800 stale flaws are refreshed at the requested 400-flaw pace while the
    // 1600 fresh ones already count as refreshed; the warm remainder is then
    // served in 1000-flaw pages, the last of which fits a single final
    // response without cursor or progress.
    const refreshProgress = { complete: false, refreshed_flaws: 2000, selected_flaws: 2400 };
    const warmProgress = { complete: true, refreshed_flaws: 2400, selected_flaws: 2400 };
    const firstEntries = botEntries(1, 400);
    const secondEntries = botEntries(401, 400);
    const thirdEntries = botEntries(801, 1000);
    const lastEntries = botEntries(1801, 600);
    const requests = servePages([
      botPage(firstEntries, 'refresh-2', refreshProgress),
      botPage(secondEntries, 'warm-1', warmProgress),
      botPage(thirdEntries, 'warm-2', warmProgress),
      botPage(lastEntries, null, null, {
        available_components: ['kernel'],
        features: botFeatures,
        total_flaws_processed: 2400,
      }),
    ]);
    const onSnapshot = vi.fn();
    const onBotKpiProgress = vi.fn();
    service.onBotKpiProgress = onBotKpiProgress;

    const result = await service.getBotKpiMetrics({}, { onSnapshot });

    expect(requests.map(request => new URL(request.url).searchParams.get('cursor')))
      .toEqual([null, 'refresh-2', 'warm-1', 'warm-2']);
    expect(result).toEqual({
      available_components: ['kernel'],
      entries: [...firstEntries, ...secondEntries, ...thirdEntries, ...lastEntries],
      features: botFeatures,
      total_flaws_processed: 2400,
    });
    expect(onSnapshot).toHaveBeenCalledTimes(4);
    expect(onBotKpiProgress.mock.calls).toEqual([[2000, 2400], [2400, 2400], [2400, 2400]]);
  });

  it('rejects a later page whose entries is not an array before publishing it', async () => {
    const first = botPage([botEntry('CVE-2026-1000')], 'cursor-2');
    servePages([first, { features: {}, total_flaws_processed: 3 }]);
    const onSnapshot = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).rejects.toThrow(
      'The Aegis server does not support detailed bot KPI reports yet.',
    );
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      aggregates_available: false, entries: first.entries,
    }));
  });

  it.each([
    { name: 'an empty string', cursor: '' },
    { name: 'a non-string value', cursor: 42 },
  ])('rejects $name as a continuation without requesting the next page', async ({ cursor }) => {
    const first = botPage([botEntry('CVE-2026-1000')], 'cursor-2');
    const invalid = botPage([botEntry('CVE-2026-1001')], cursor as unknown as string);
    const requests = servePages([first, invalid]);
    const onSnapshot = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).rejects.toThrow(
      'KPI pagination continuation is invalid. Select Refresh.',
    );
    expect(requests).toHaveLength(2);
    expect(onSnapshot).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      aggregates_available: false, entries: first.entries,
    }));
  });

  it('cuts off a server that never stops paginating after 200 pages', async () => {
    const requests: Request[] = [];
    server.use(http.get(botUrl, ({ request }) => {
      requests.push(request);
      return HttpResponse.json(botPage([botEntry('CVE-2026-1000')], 'opaque'));
    }));

    await expect(service.getBotKpiMetrics()).rejects.toThrow(
      'osidb-bot KPI pagination did not complete after 200 pages.',
    );
    expect(requests).toHaveLength(200);
  });

  it('finishes an empty selection without a follow-up page', async () => {
    const requests = servePages([botPage([], null, { complete: true, refreshed_flaws: 0, selected_flaws: 0 })]);
    const onSnapshot = vi.fn();
    service.onBotKpiProgress = vi.fn();
    await expect(service.getBotKpiMetrics({}, { onSnapshot })).resolves.toMatchObject({
      entries: [], features: {}, total_flaws_processed: 0,
    });
    expect(requests).toHaveLength(1);
    expect(service.onBotKpiProgress).toHaveBeenCalledExactlyOnceWith(0, 0);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('publishes intermediate snapshots without progress when the server reports none', async () => {
    servePages([
      botPage([botEntry('CVE-2026-1000')], 'legacy'),
      botPage([botEntry('CVE-2026-1001')], null, null, { features: botFeatures, total_flaws_processed: 2 }),
    ]);
    const onSnapshot = vi.fn();
    service.onBotKpiProgress = vi.fn();

    const result = await service.getBotKpiMetrics({}, { onSnapshot });

    expect(onSnapshot.mock.calls[0][0]).toMatchObject({
      aggregates_available: false, entries: [botEntry('CVE-2026-1000')], features: {}, total_flaws_processed: 0,
    });
    expect(onSnapshot.mock.calls[0][0].progress).toBeUndefined();
    expect(service.onBotKpiProgress).not.toHaveBeenCalled();
    expect(result).toEqual({
      entries: [botEntry('CVE-2026-1000'), botEntry('CVE-2026-1001')],
      features: botFeatures,
      total_flaws_processed: 2,
    });
  });

  it.each([409, 410, 500])('retains the partial snapshot on HTTP %s and restarts on request', async (status) => {
    const partial = botPage(
      [botEntry('CVE-2026-1000')],
      'opaque',
      { complete: false, refreshed_flaws: 1, selected_flaws: 3 },
    );
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
      aggregates_available: false, entries: partial.entries, features: {}, total_flaws_processed: 0,
    }));
    server.use(http.get(botUrl, ({ request }) => {
      requests.push(request);
      expect(new URL(request.url).searchParams.has('cursor')).toBe(false);
      return HttpResponse.json(finalPage);
    }));
    await expect(service.getBotKpiMetrics()).resolves.toMatchObject({ entries: [] });
    expect(requests).toHaveLength(3);
  });

  it('requests pages back-to-back without pacing waits', async () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    servePages([
      botPage([botEntry('CVE-2026-1000')], 'opaque'),
      botPage([], null, null, { features: botFeatures, total_flaws_processed: 1 }),
    ]);
    try {
      await expect(service.getBotKpiMetrics()).resolves.toMatchObject({ total_flaws_processed: 1 });
      expect(timeout).not.toHaveBeenCalled();
    } finally {
      timeout.mockRestore();
    }
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
        : HttpResponse.json(endpoint === 'cve' ? {} : finalPage);
    }));
    const pending = endpoint === 'cve' ? service.getKpiMetrics() : service.getBotKpiMetrics();
    const expected = endpoint === 'cve'
      ? {}
      : { entries: [], features: {}, total_flaws_processed: 0 };
    await expect(pending).resolves.toEqual(expected);
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
      return HttpResponse.json(endpoint === 'cve' ? {} : finalPage);
    }));
    const controller = new AbortController();
    controller.abort();
    const pending = endpoint === 'cve'
      ? service.getKpiMetrics('all', {}, controller.signal)
      : service.getBotKpiMetrics({}, { signal: controller.signal });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(requests).toEqual([]);
  });

  it('resets the retry budget per page and uses 250/500/1000ms backoffs on the same cursor', async () => {
    const requests: Request[] = [];
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    server.use(http.get(botUrl, ({ request }) => {
      requests.push(request);
      if (requests.length % 4 !== 0) return HttpResponse.text('Retry', { status: 503 });
      return HttpResponse.json(new URL(request.url).searchParams.has('cursor')
        ? botPage([botEntry('CVE-2026-1000')], null, null, { features: botFeatures, total_flaws_processed: 1 })
        : botPage([], 'opaque'));
    }));
    try {
      await expect(service.getBotKpiMetrics()).resolves.toMatchObject({ total_flaws_processed: 1 });
      expect(requests).toHaveLength(8);
      expect(timeout.mock.calls.filter(([, ms]) => [250, 500, 1000].includes(Number(ms))).map(([, ms]) => ms))
        .toEqual([250, 500, 1000, 250, 500, 1000]);
      const params = requests.slice(4).map(request => new URL(request.url).searchParams);
      expect(params.every(value => value.get('cursor') === 'opaque')).toBe(true);
    } finally {
      timeout.mockRestore();
    }
  }, 15000);

  it.each(['cve', 'osidb-bot'])('aborts pending %s HTTP promptly without a failure snapshot', async (endpoint) => {
    const gate = deferred();
    const requests: Request[] = [];
    server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, async ({ request }) => {
      requests.push(request);
      await gate.promise;
      return HttpResponse.json(endpoint === 'cve' ? {} : finalPage);
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
