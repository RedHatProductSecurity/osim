import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { useKpiDashboard } from '@/composables/aegis/useKpiDashboard';

import { withSetup } from '@/__tests__/helpers';
import { AegisAIService } from '@/services/AegisAIService';
import type { AegisBotKpiCacheStatus, AegisBotKpiMetrics } from '@/types/aegisAI';

vi.mock('@/services/AegisAIService');

describe('useKpiDashboard', () => {
  const getFeedback = vi.fn();
  const getBot = vi.fn();
  // Resolves null so the auxiliary cache-status load stays invisible to the
  // pre-existing assertions; cache-status behavior has its own tests.
  const getCacheStatus = vi.fn();
  // Resolves an all-fresh cache so the drain completes in one poll and the
  // pre-existing assertions are unaffected; drain behavior has its own tests.
  const refreshCache = vi.fn();
  let app: App | undefined;
  const snapshot: AegisBotKpiMetrics = {
    entries: [],
    features: {},
    total_flaws_processed: 0,
  };
  const withProgress = (delivered: number, selected: number): AegisBotKpiMetrics => ({
    ...snapshot,
    progress: { complete: delivered === selected, delivered_flaws: delivered, selected_flaws: selected },
  });
  const publish = (call = 0) => getBot.mock.calls[call][1].onSnapshot(snapshot);
  const cacheStatus: AegisBotKpiCacheStatus = {
    fresh_count: 3,
    outdated_count: 1,
    stale_count: 2,
    total_flaws_selected: 5,
    uncached_count: 1,
  };
  // A post-slice cache-refresh response: the drain consumes only the stale and
  // selection counts, but the payload mirrors the server's full status shape.
  const drainCounts = (staleCount: number, totalFlaws: number): AegisBotKpiCacheStatus => ({
    fresh_count: totalFlaws - staleCount,
    outdated_count: 0,
    stale_count: staleCount,
    total_flaws_selected: totalFlaws,
    uncached_count: staleCount,
  });

  beforeEach(() => {
    getFeedback.mockReset().mockResolvedValue({});
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    getCacheStatus.mockReset().mockResolvedValue(null);
    refreshCache.mockReset().mockResolvedValue({ stale_count: 0 });
    vi.mocked(AegisAIService).mockImplementation(function () {
      return {
        getBotKpiCacheStatus: getCacheStatus,
        refreshBotKpiCache: refreshCache,
        getBotKpiMetrics: getBot,
        getKpiMetrics: getFeedback,
      } as unknown as AegisAIService;
    });
  });
  afterEach(() => {
    app?.unmount();
    app = undefined;
  });

  function mountDashboard() {
    const [dashboard, mounted] = withSetup(() => useKpiDashboard());
    app = mounted;
    return dashboard;
  }

  it('starts at zero with unknown selected count and tracks progress from each snapshot', async () => {
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.botProgress.value).toEqual({ pages: 0, delivered: 0, selected: null });
    expect(dashboard.loading.value).toBe(true);

    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40));
    expect(dashboard.botProgress.value).toEqual({ pages: 1, delivered: 10, selected: 40 });
    expect(dashboard.bot.value).toEqual(withProgress(10, 40));
    expect(dashboard.botIncomplete.value).toBe(true);

    getBot.mock.calls[0][1].onSnapshot(withProgress(30, 40));
    expect(dashboard.botProgress.value).toEqual({ pages: 2, delivered: 30, selected: 40 });

    // A page without a progress block clears both counts but still counts as a received page.
    publish();
    expect(dashboard.botProgress.value).toEqual({ pages: 3, delivered: null, selected: null });
  });

  it('resets bot progress when a new refresh starts and ignores progress from the superseded fetch', async () => {
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40));
    const signal = getBot.mock.calls[0][1].signal;

    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(signal.aborted).toBe(true);
    expect(dashboard.botProgress.value).toEqual({ pages: 0, delivered: 0, selected: null });
    getBot.mock.calls[0][1].onSnapshot(withProgress(20, 40));
    expect(dashboard.botProgress.value).toEqual({ pages: 0, delivered: 0, selected: null });
    getBot.mock.calls[1][1].onSnapshot(withProgress(5, 30));
    expect(dashboard.botProgress.value).toEqual({ pages: 1, delivered: 5, selected: 30 });
  });

  it('publishes the resolved metrics with their final progress when the run finishes', async () => {
    getBot.mockResolvedValue(withProgress(40, 40));
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.botProgress.value).toEqual({ pages: 1, delivered: 40, selected: 40 });
    expect(dashboard.botIncomplete.value).toBe(false);
    expect(dashboard.loading.value).toBe(false);
  });

  it('counts distinct snapshots as pages but not the resolved re-publish of the final one', async () => {
    const first = withProgress(10, 40);
    const final = withProgress(40, 40);
    getBot.mockReset().mockImplementation((_query, options) => {
      options.onSnapshot(first);
      options.onSnapshot(final);
      return Promise.resolve(final);
    });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.botProgress.value).toEqual({ pages: 2, delivered: 40, selected: 40 });
    expect(dashboard.botIncomplete.value).toBe(false);
  });

  it('ignores snapshots after the dashboard unmounts', async () => {
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40));
    const signal = getBot.mock.calls[0][1].signal;
    expect(dashboard.botProgress.value).toEqual({ pages: 1, delivered: 10, selected: 40 });

    app!.unmount();
    getBot.mock.calls[0][1].onSnapshot({ ...snapshot, total_flaws_processed: 20 });

    expect(signal.aborted).toBe(true);
    expect(dashboard.bot.value).toEqual(withProgress(10, 40));
    expect(dashboard.botProgress.value).toEqual({ pages: 1, delivered: 10, selected: 40 });
    app = undefined;
  });

  it('aborts both sources on invalid dates and starts a fresh run after correction', async () => {
    getFeedback.mockReturnValue(new Promise(() => {}));
    const dashboard = mountDashboard();
    dashboard.fromDate.value = '2026-09-03';
    await flushPromises();
    const botSignal = getBot.mock.lastCall![1].signal;
    const feedbackSignal = getFeedback.mock.lastCall![2];
    const calls = getBot.mock.calls.length;
    dashboard.toDate.value = '2026-09-01';
    await flushPromises();
    expect(botSignal.aborted).toBe(true);
    expect(feedbackSignal.aborted).toBe(true);
    expect(getBot).toHaveBeenCalledTimes(calls);
    expect(dashboard.loading.value).toBe(false);
    expect(dashboard.errors.value).toEqual([]);
    dashboard.toDate.value = '2026-09-04';
    await flushPromises();
    expect(getBot).toHaveBeenCalledTimes(calls + 1);
    expect(getBot.mock.lastCall![1].signal.aborted).toBe(false);
    expect(dashboard.loading.value).toBe(true);
  });

  it('short-circuits refresh before any request while the date range is invalid', async () => {
    const dashboard = mountDashboard();
    await flushPromises();
    getFeedback.mockClear();
    getBot.mockClear();
    getCacheStatus.mockClear();
    dashboard.fromDate.value = '2026-09-03';
    dashboard.toDate.value = '2026-09-01';
    await flushPromises();
    expect(dashboard.invalidRange.value).toBe(true);
    expect(getFeedback).not.toHaveBeenCalled();
    expect(getBot).not.toHaveBeenCalled();
    expect(getCacheStatus).not.toHaveBeenCalled();
    await dashboard.refresh();
    expect(getFeedback).not.toHaveBeenCalled();
    expect(getBot).not.toHaveBeenCalled();
    expect(getCacheStatus).not.toHaveBeenCalled();
    expect(dashboard.botCacheStatus.value).toBeNull();
    expect(dashboard.loading.value).toBe(false);
  });

  it('loads the cache status in parallel with both metric sources on a shared abort signal', async () => {
    getCacheStatus.mockResolvedValueOnce(cacheStatus);
    const dashboard = mountDashboard();
    await flushPromises();

    const signal = getFeedback.mock.calls[0][2];
    expect(getCacheStatus).toHaveBeenCalledExactlyOnceWith(undefined, signal);
    expect(getBot.mock.calls[0][1].signal).toBe(signal);
    expect(dashboard.botCacheStatus.value).toEqual(cacheStatus);
    expect(dashboard.cacheStatusError.value).toBeNull();
  });

  it('passes only the trimmed component filter to the cache status load', async () => {
    const dashboard = mountDashboard();
    await flushPromises();

    dashboard.component.value = '  kernel  ';
    await flushPromises();
    expect(getCacheStatus).toHaveBeenLastCalledWith('kernel', expect.any(AbortSignal));

    dashboard.component.value = '';
    await flushPromises();
    expect(getCacheStatus).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
  });

  it('resets the published cache status when a new refresh starts', async () => {
    getCacheStatus.mockResolvedValueOnce(cacheStatus);
    const dashboard = mountDashboard();
    await flushPromises();
    expect(dashboard.botCacheStatus.value).toEqual(cacheStatus);

    getCacheStatus.mockReturnValueOnce(new Promise(() => {}));
    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(getCacheStatus).toHaveBeenCalledTimes(2);
    expect(dashboard.botCacheStatus.value).toBeNull();
  });

  it('resets a cache status failure when a new refresh starts', async () => {
    getCacheStatus.mockRejectedValueOnce({ response: { status: 500 }, message: 'Cache read failed' });
    const dashboard = mountDashboard();
    await flushPromises();
    expect(dashboard.cacheStatusError.value).toContain('could not be loaded');

    getCacheStatus.mockReturnValueOnce(new Promise(() => {}));
    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(dashboard.cacheStatusError.value).toBeNull();
    expect(dashboard.botCacheStatus.value).toBeNull();
  });

  it('reports cache status failures separately from metric-source errors', async () => {
    getBot.mockResolvedValue({ entries: [], features: {}, total_flaws_processed: 0 });
    getCacheStatus.mockRejectedValueOnce({ response: { status: 503 }, message: 'Cache status unavailable' });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.cacheStatusError.value).toContain('The osidb-bot KPI cache status could not be loaded');
    expect(dashboard.cacheStatusError.value).toContain('HTTP 503: Cache status unavailable');
    expect(dashboard.errors.value).toEqual([]);
    expect(dashboard.loadedSources.value).toEqual(expect.arrayContaining(['Feedback', 'osidb-bot']));
    expect(dashboard.loading.value).toBe(false);
  });

  it('treats a 404 from an older Aegis server as unsupported rather than failed', async () => {
    getCacheStatus.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.botCacheStatus.value).toBeNull();
    expect(dashboard.cacheStatusError.value).toBeNull();
  });

  it('does not gate the loading state on a pending cache status load', async () => {
    getCacheStatus.mockReturnValue(new Promise(() => {}));
    getBot.mockResolvedValue({ entries: [], features: {}, total_flaws_processed: 0 });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.feedbackLoading.value).toBe(false);
    expect(dashboard.botLoading.value).toBe(false);
    expect(dashboard.loading.value).toBe(false);
    expect(dashboard.cacheStatusError.value).toBeNull();
  });

  it('ignores a superseded cache status response arriving after a newer refresh', async () => {
    let resolveSuperseded!: (value: AegisBotKpiCacheStatus) => void;
    getCacheStatus.mockReturnValueOnce(new Promise((resolve) => { resolveSuperseded = resolve; }));
    const dashboard = mountDashboard();
    getCacheStatus.mockResolvedValueOnce({ ...cacheStatus, fresh_count: 5, stale_count: 0 });
    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(getCacheStatus.mock.calls[0][1].aborted).toBe(true);
    expect(dashboard.botCacheStatus.value).toMatchObject({ fresh_count: 5, stale_count: 0 });
    resolveSuperseded(cacheStatus);
    await flushPromises();
    expect(dashboard.botCacheStatus.value).toMatchObject({ fresh_count: 5, stale_count: 0 });
  });

  it('ignores a superseded cache status failure arriving after a newer refresh', async () => {
    let rejectSuperseded!: (reason: unknown) => void;
    getCacheStatus.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectSuperseded = reject; }));
    const dashboard = mountDashboard();
    getCacheStatus.mockResolvedValueOnce(cacheStatus);
    dashboard.component.value = 'kernel';
    await flushPromises();
    expect(dashboard.botCacheStatus.value).toEqual(cacheStatus);

    rejectSuperseded({ response: { status: 500 }, message: 'Obsolete cache failure' });
    await flushPromises();

    expect(dashboard.cacheStatusError.value).toBeNull();
    expect(dashboard.botCacheStatus.value).toEqual(cacheStatus);
  });

  it('ignores a cache status response arriving after the dashboard unmounts', async () => {
    let resolveStatus!: (value: AegisBotKpiCacheStatus) => void;
    getCacheStatus.mockReturnValueOnce(new Promise((resolve) => { resolveStatus = resolve; }));
    const dashboard = mountDashboard();
    app!.unmount();
    app = undefined;
    expect(getCacheStatus.mock.calls[0][1].aborted).toBe(true);

    resolveStatus(cacheStatus);
    await flushPromises();
    expect(dashboard.botCacheStatus.value).toBeNull();
  });

  it('drains the cache before fetching pages, polling until the selection is fresh', async () => {
    refreshCache
      .mockResolvedValueOnce(drainCounts(5, 10))
      .mockResolvedValueOnce(drainCounts(0, 10));
    const dashboard = mountDashboard();
    await flushPromises();

    expect(refreshCache).toHaveBeenCalledTimes(2);
    expect(getBot).toHaveBeenCalledTimes(1);
    // Pages are fetched only after the drain finished, on the shared abort signal.
    expect(refreshCache.mock.invocationCallOrder[1]).toBeLessThan(getBot.mock.invocationCallOrder[0]);
    expect(refreshCache.mock.calls[0][1]).toBe(getBot.mock.calls[0][1].signal);
    expect(dashboard.botRefresh.value).toEqual({ remaining: 0, total: 10 });
    expect(dashboard.loading.value).toBe(true);
  });

  it('passes only the trimmed component filter to the cache drain', async () => {
    const dashboard = mountDashboard();
    await flushPromises();
    expect(refreshCache).toHaveBeenNthCalledWith(1, undefined, expect.any(AbortSignal));

    dashboard.component.value = '  kernel  ';
    await flushPromises();
    expect(refreshCache).toHaveBeenLastCalledWith('kernel', expect.any(AbortSignal));

    dashboard.component.value = '';
    await flushPromises();
    expect(refreshCache).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
  });

  it('tracks the observed drain counts and resets them when a new refresh starts', async () => {
    let resolveFirst!: (value: AegisBotKpiCacheStatus) => void;
    let resolveSecond!: (value: AegisBotKpiCacheStatus) => void;
    refreshCache.mockReset()
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }))
      .mockReturnValue(new Promise(() => {}));
    const dashboard = mountDashboard();
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ remaining: null, total: null });

    resolveFirst(drainCounts(4, 6));
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ remaining: 4, total: 6 });

    resolveSecond(drainCounts(1, 6));
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ remaining: 1, total: 6 });

    // A new refresh clears the counts while its own drain is still pending.
    dashboard.component.value = 'kernel';
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ remaining: null, total: null });
    expect(getBot).not.toHaveBeenCalled();
  });

  it('skips the drain when an older Aegis server lacks the cache-refresh endpoint', async () => {
    refreshCache.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(refreshCache).toHaveBeenCalledTimes(1);
    expect(getBot).toHaveBeenCalledTimes(1);
    expect(dashboard.errors.value).toEqual([]);
    expect(dashboard.botRefresh.value).toEqual({ remaining: null, total: null });
  });

  it('clears published drain counts when a later poll finds the endpoint unsupported', async () => {
    refreshCache
      .mockResolvedValueOnce(drainCounts(5, 10))
      .mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(refreshCache).toHaveBeenCalledTimes(2);
    expect(dashboard.botRefresh.value).toEqual({ remaining: null, total: null });
    expect(getBot).toHaveBeenCalledTimes(1);
    expect(dashboard.errors.value).toEqual([]);
  });

  it('keeps the replacement run\'s drain counts when a superseded poll rejects with 404', async () => {
    let resolveSupersededPoll!: (value: AegisBotKpiCacheStatus) => void;
    let rejectSupersededPoll!: (reason: unknown) => void;
    refreshCache.mockReset()
      .mockReturnValueOnce(new Promise((resolve) => { resolveSupersededPoll = resolve; }))
      .mockReturnValueOnce(new Promise((_resolve, reject) => { rejectSupersededPoll = reject; }))
      .mockResolvedValueOnce(drainCounts(2, 8))
      .mockReturnValue(new Promise(() => {}));
    const dashboard = mountDashboard();
    await flushPromises();
    resolveSupersededPoll(drainCounts(5, 10));
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ remaining: 5, total: 10 });

    dashboard.component.value = 'kernel';
    await flushPromises();
    // The replacement run observed a partially stale cache and is still draining.
    expect(dashboard.botRefresh.value).toEqual({ remaining: 2, total: 8 });

    rejectSupersededPoll({ response: { status: 404 }, message: 'Not Found' });
    await flushPromises();
    // The stale rejection neither clears the live counts nor surfaces an error.
    expect(dashboard.botRefresh.value).toEqual({ remaining: 2, total: 8 });
    expect(dashboard.errors.value).toEqual([]);
  });

  it('surfaces a failed drain through the osidb-bot error path and never fetches pages', async () => {
    refreshCache.mockRejectedValueOnce({ response: { status: 503 }, message: 'Refresh unavailable' });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(getBot).not.toHaveBeenCalled();
    expect(dashboard.errors.value).toHaveLength(1);
    expect(dashboard.errors.value[0]).toContain('osidb-bot metrics could not be loaded');
    expect(dashboard.errors.value[0]).toContain('HTTP 503: Refresh unavailable');
    expect(dashboard.botLoading.value).toBe(false);
    expect(dashboard.loadedSources.value).toEqual(['Feedback']);
  });

  it.each(['a filter change', 'an invalid date range', 'an unmount'])(
    'aborts the in-flight drain poll on %s without surfacing an error', async (action) => {
      // Polls settle only through their abort signal, mirroring the real fetch.
      refreshCache.mockReset().mockImplementation((_component: string | undefined, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject({ name: 'AbortError' }));
        }));
      const dashboard = mountDashboard();
      await flushPromises();
      expect(refreshCache).toHaveBeenCalledTimes(1);
      const drainSignal = refreshCache.mock.calls[0][1];
      expect(drainSignal.aborted).toBe(false);

      if (action === 'a filter change') dashboard.component.value = 'kernel';
      if (action === 'an invalid date range') {
        dashboard.fromDate.value = '2026-09-03';
        await flushPromises();
        dashboard.toDate.value = '2026-09-01';
      }
      if (action === 'an unmount') {
        app!.unmount();
        app = undefined;
      }
      await flushPromises();

      expect(drainSignal.aborted).toBe(true);
      // The aborted drain never issues another poll and never fetches pages.
      expect(refreshCache.mock.calls.filter(([, signal]) => signal === drainSignal)).toHaveLength(1);
      expect(getBot).not.toHaveBeenCalled();
      expect(dashboard.errors.value).toEqual([]);
      if (action === 'an invalid date range') {
        expect(dashboard.invalidRange.value).toBe(true);
        expect(dashboard.loading.value).toBe(false);
      }
    },
  );

  it('ignores a superseded drain poll that resolves after a newer refresh', async () => {
    let resolveSuperseded!: (value: AegisBotKpiCacheStatus) => void;
    refreshCache.mockReturnValueOnce(new Promise((resolve) => { resolveSuperseded = resolve; }));
    const dashboard = mountDashboard();
    await flushPromises();
    expect(refreshCache).toHaveBeenCalledTimes(1);

    dashboard.component.value = 'kernel';
    await flushPromises();
    // The replacement run drained its own already-fresh cache and fetched pages.
    expect(refreshCache).toHaveBeenCalledTimes(2);
    expect(getBot).toHaveBeenCalledTimes(1);

    resolveSuperseded(drainCounts(7, 9));
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ remaining: 0, total: undefined });
    expect(refreshCache).toHaveBeenCalledTimes(2);
    expect(getBot).toHaveBeenCalledTimes(1);
    expect(dashboard.errors.value).toEqual([]);
  });

  it('gives up the drain after ten thousand polls that never reach a fresh cache', async () => {
    refreshCache.mockResolvedValue(drainCounts(5, 10));
    const dashboard = mountDashboard();
    await flushPromises();

    expect(refreshCache).toHaveBeenCalledTimes(10_000);
    expect(getBot).not.toHaveBeenCalled();
    expect(dashboard.errors.value).toHaveLength(1);
    // The thrown message carries no guidance of its own: kpiErrorMessage
    // appends it exactly once.
    expect(dashboard.errors.value[0]).toBe(
      'osidb-bot metrics could not be loaded. osidb-bot KPI cache refresh did not drain. '
      + 'Select Refresh to try again.',
    );
    expect(dashboard.botLoading.value).toBe(false);
  });
});
