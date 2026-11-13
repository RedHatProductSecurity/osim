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
    delivery: { run_id: 'run', page_id: 'page', received_flaws: 10, selected_flaws: 40, complete: false },
  };
  const publish = (call = 0) => getBot.mock.calls[call][1].onSnapshot(snapshot);

  beforeEach(() => {
    getFeedback.mockReset().mockResolvedValue({});
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    vi.mocked(AegisAIService).mockImplementation(function () {
      return { getBotKpiMetrics: getBot, getKpiMetrics: getFeedback } as unknown as AegisAIService;
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

  it('starts at zero with unknown selected count and publishes snapshots while loading', () => {
    const dashboard = mountDashboard();

    expect(dashboard.botProgress.value).toEqual({ received: 0, selected: null });
    expect(dashboard.loading.value).toBe(true);

    publish();
    expect(dashboard.botProgress.value).toEqual({ received: 10, selected: 40 });
    expect(dashboard.bot.value).toEqual(snapshot);
    expect(dashboard.botIncomplete.value).toBe(true);
  });

  it('resets bot progress when a new refresh starts and ignores progress from the superseded fetch', async () => {
    const dashboard = mountDashboard();
    publish();
    const signal = getBot.mock.calls[0][1].signal;

    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(signal.aborted).toBe(true);
    expect(dashboard.botProgress.value).toEqual({ received: 0, selected: null });
    publish();
    expect(dashboard.botProgress.value).toEqual({ received: 0, selected: null });
    publish(1);
    expect(dashboard.botProgress.value).toEqual({ received: 10, selected: 40 });
  });

  it('ignores progress callbacks after the dashboard unmounts', () => {
    const dashboard = mountDashboard();
    publish();
    const signal = getBot.mock.calls[0][1].signal;
    expect(dashboard.botProgress.value).toEqual({ received: 10, selected: 40 });

    app!.unmount();
    getBot.mock.calls[0][1].onSnapshot({ ...snapshot, total_flaws_processed: 20 });

    expect(signal.aborted).toBe(true);
    expect(dashboard.bot.value).toEqual(snapshot);
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
});
