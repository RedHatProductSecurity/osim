import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { useKpiDashboard } from '@/composables/aegis/useKpiDashboard';

import { withSetup } from '@/__tests__/helpers';
import { AegisAIService } from '@/services/AegisAIService';
import type { AegisBotKpiMetrics } from '@/types/aegisAI';

vi.mock('@/services/AegisAIService');

describe('useKpiDashboard', () => {
  const getFeedback = vi.fn();
  const getBot = vi.fn();
  let app: App | undefined;
  const snapshot: AegisBotKpiMetrics = {
    entries: [],
    features: {},
    total_flaws_processed: 0,
  };
  const withProgress = (delivered: number, selected: number, refreshed?: number): AegisBotKpiMetrics => ({
    ...snapshot,
    progress: {
      complete: delivered === selected,
      delivered_flaws: delivered,
      ...(refreshed !== undefined ? { refreshed_flaws: refreshed } : {}),
      selected_flaws: selected,
    },
  });
  const publish = (call = 0) => getBot.mock.calls[call][1].onSnapshot(snapshot);

  beforeEach(() => {
    getFeedback.mockReset().mockResolvedValue({});
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    vi.mocked(AegisAIService).mockImplementation(function () {
      return {
        getBotKpiMetrics: getBot,
        getKpiMetrics: getFeedback,
      } as unknown as AegisAIService;
    });
  });
  afterEach(() => {
    app?.unmount();
    app = undefined;
    vi.useRealTimers();
  });

  function mountDashboard() {
    const [dashboard, mounted] = withSetup(() => useKpiDashboard());
    app = mounted;
    return dashboard;
  }

  it('starts at zero with unknown selected count and tracks progress from each snapshot', async () => {
    // Pinned time keeps the estimate absent: no page pair has spanned any
    // observable delivery interval yet.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-25T12:00:00Z') });
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.botProgress.value).toEqual({ delivered: 0, etaMs: null, pages: 0, selected: null });
    expect(dashboard.loading.value).toBe(true);

    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40));
    expect(dashboard.botProgress.value).toEqual({ delivered: 10, etaMs: null, pages: 1, selected: 40 });
    expect(dashboard.bot.value).toEqual(withProgress(10, 40));
    expect(dashboard.botIncomplete.value).toBe(true);

    getBot.mock.calls[0][1].onSnapshot(withProgress(30, 40));
    expect(dashboard.botProgress.value).toEqual({ delivered: 30, etaMs: null, pages: 2, selected: 40 });

    // A page without a progress block clears both counts but still counts as a received page.
    publish();
    expect(dashboard.botProgress.value).toEqual({ delivered: null, etaMs: null, pages: 3, selected: null });
  });

  it('resets bot progress when a new refresh starts and ignores progress from the superseded fetch', async () => {
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40));
    const signal = getBot.mock.calls[0][1].signal;

    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(signal.aborted).toBe(true);
    expect(dashboard.botProgress.value).toEqual({ delivered: 0, etaMs: null, pages: 0, selected: null });
    getBot.mock.calls[0][1].onSnapshot(withProgress(20, 40));
    expect(dashboard.botProgress.value).toEqual({ delivered: 0, etaMs: null, pages: 0, selected: null });
    getBot.mock.calls[1][1].onSnapshot(withProgress(5, 30));
    expect(dashboard.botProgress.value).toEqual({ delivered: 5, etaMs: null, pages: 1, selected: 30 });
  });

  it('publishes the resolved metrics with their final progress when the run finishes', async () => {
    getBot.mockResolvedValue(withProgress(40, 40));
    const dashboard = mountDashboard();
    await flushPromises();

    expect(dashboard.botProgress.value).toEqual({ delivered: 40, etaMs: null, pages: 1, selected: 40 });
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

    expect(dashboard.botProgress.value).toEqual({ delivered: 40, etaMs: null, pages: 2, selected: 40 });
    expect(dashboard.botIncomplete.value).toBe(false);
  });

  it('ignores snapshots after the dashboard unmounts', async () => {
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40));
    const signal = getBot.mock.calls[0][1].signal;
    expect(dashboard.botProgress.value).toEqual({ delivered: 10, etaMs: null, pages: 1, selected: 40 });

    app!.unmount();
    getBot.mock.calls[0][1].onSnapshot({ ...snapshot, total_flaws_processed: 20 });

    expect(signal.aborted).toBe(true);
    expect(dashboard.bot.value).toEqual(withProgress(10, 40));
    expect(dashboard.botProgress.value).toEqual({ delivered: 10, etaMs: null, pages: 1, selected: 40 });
    app = undefined;
  });

  it('estimates the remaining page time once a later page has grown the delivery', async () => {
    const startedAt = new Date('2026-11-25T12:00:00Z');
    vi.useFakeTimers({ toFake: ['Date'], now: startedAt });
    const dashboard = mountDashboard();
    await flushPromises();

    // The first page only anchors the delivery rate: nothing to extrapolate yet.
    getBot.mock.calls[0][1].onSnapshot(withProgress(1000, 4000));
    expect(dashboard.botProgress.value).toEqual({ delivered: 1000, etaMs: null, pages: 1, selected: 4000 });

    // Five seconds later the delivery doubled with half the selection still
    // to come: ten more seconds at the observed rate.
    vi.setSystemTime(new Date(startedAt.getTime() + 5_000));
    getBot.mock.calls[0][1].onSnapshot(withProgress(2000, 4000));
    expect(dashboard.botProgress.value).toEqual({ delivered: 2000, etaMs: 10_000, pages: 2, selected: 4000 });
  });

  it('keeps the page estimate null without growth, without counts, or once delivery completes', async () => {
    const startedAt = new Date('2026-11-25T12:00:00Z');
    vi.useFakeTimers({ toFake: ['Date'], now: startedAt });
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(1000, 4000));

    // A later page that delivered nothing new offers no rate to extrapolate.
    vi.setSystemTime(new Date(startedAt.getTime() + 20_000));
    getBot.mock.calls[0][1].onSnapshot(withProgress(1000, 4000));
    expect(dashboard.botProgress.value).toEqual({ delivered: 1000, etaMs: null, pages: 2, selected: 4000 });

    // An older server's page without progress counts cannot anchor a rate.
    vi.setSystemTime(new Date(startedAt.getTime() + 40_000));
    publish();
    expect(dashboard.botProgress.value).toEqual({ delivered: null, etaMs: null, pages: 3, selected: null });

    // A completed delivery has nothing left to estimate.
    vi.setSystemTime(new Date(startedAt.getTime() + 60_000));
    getBot.mock.calls[0][1].onSnapshot(withProgress(4000, 4000));
    expect(dashboard.botProgress.value).toEqual({ delivered: 4000, etaMs: null, pages: 4, selected: 4000 });
  });

  it('keeps a superseded run\'s late snapshot from updating the live run\'s page estimate', async () => {
    const startedAt = new Date('2026-11-25T12:00:00Z');
    vi.useFakeTimers({ toFake: ['Date'], now: startedAt });
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(1000, 4000));

    dashboard.component.value = 'kernel';
    await flushPromises();

    // The replacement run anchors and estimates on its own pages.
    vi.setSystemTime(new Date(startedAt.getTime() + 5_000));
    getBot.mock.calls[1][1].onSnapshot(withProgress(1000, 4000));
    vi.setSystemTime(new Date(startedAt.getTime() + 10_000));
    getBot.mock.calls[1][1].onSnapshot(withProgress(2000, 4000));
    expect(dashboard.botProgress.value).toEqual({ delivered: 2000, etaMs: 10_000, pages: 2, selected: 4000 });

    // A late page from the superseded run must not disturb that estimate.
    vi.setSystemTime(new Date(startedAt.getTime() + 15_000));
    getBot.mock.calls[0][1].onSnapshot(withProgress(4000, 4000));
    expect(dashboard.botProgress.value).toEqual({ delivered: 2000, etaMs: 10_000, pages: 2, selected: 4000 });
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
    dashboard.fromDate.value = '2026-09-03';
    dashboard.toDate.value = '2026-09-01';
    await flushPromises();
    expect(dashboard.invalidRange.value).toBe(true);
    expect(getFeedback).not.toHaveBeenCalled();
    expect(getBot).not.toHaveBeenCalled();
    await dashboard.refresh();
    expect(getFeedback).not.toHaveBeenCalled();
    expect(getBot).not.toHaveBeenCalled();
    expect(dashboard.loading.value).toBe(false);
  });

  it('derives the refresh indicator from each page snapshot\'s refreshed count', async () => {
    // Pinned time keeps the estimate absent: no page pair has spanned any
    // observable refresh interval yet.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-25T12:00:00Z') });
    const dashboard = mountDashboard();
    await flushPromises();
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: null, total: null });

    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40, 8));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 32, total: 40 });

    getBot.mock.calls[0][1].onSnapshot(withProgress(30, 40, 36));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 4, total: 40 });

    // A page without a refreshed count leaves the last indicator standing.
    getBot.mock.calls[0][1].onSnapshot(withProgress(35, 40));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 4, total: 40 });

    // A fully refreshed selection reports nothing remaining.
    getBot.mock.calls[0][1].onSnapshot(withProgress(40, 40, 40));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 0, total: 40 });
  });

  it('resets the refresh indicator when a new refresh starts', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-25T12:00:00Z') });
    const dashboard = mountDashboard();
    await flushPromises();
    getBot.mock.calls[0][1].onSnapshot(withProgress(10, 40, 8));

    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: null, total: null });
    // The replacement run re-derives the indicator from its own pages.
    getBot.mock.calls[1][1].onSnapshot(withProgress(5, 30, 3));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 27, total: 30 });
  });

  it('estimates the remaining refresh time once a later page has grown the refreshed count', async () => {
    const startedAt = new Date('2026-11-25T12:00:00Z');
    vi.useFakeTimers({ toFake: ['Date'], now: startedAt });
    const dashboard = mountDashboard();
    await flushPromises();

    // The first page only anchors the refresh backlog: nothing to extrapolate yet.
    getBot.mock.calls[0][1].onSnapshot(withProgress(1000, 4000, 1000));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 3000, total: 4000 });

    // A later page that refreshed nothing new offers no rate to extrapolate.
    vi.setSystemTime(new Date(startedAt.getTime() + 10_000));
    getBot.mock.calls[0][1].onSnapshot(withProgress(2000, 4000, 1000));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: null, remaining: 3000, total: 4000 });

    // Twenty seconds in, two thirds of the backlog is gone: ten more seconds
    // at the observed rate cover the remaining third.
    vi.setSystemTime(new Date(startedAt.getTime() + 20_000));
    getBot.mock.calls[0][1].onSnapshot(withProgress(3000, 4000, 3000));
    expect(dashboard.botRefresh.value).toEqual({ etaMs: 10_000, remaining: 1000, total: 4000 });
  });
});
