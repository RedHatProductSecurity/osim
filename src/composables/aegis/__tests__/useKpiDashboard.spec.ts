import type { App } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { useKpiDashboard } from '@/composables/aegis/useKpiDashboard';

import { withSetup } from '@/__tests__/helpers';
import { AegisAIService } from '@/services/AegisAIService';

vi.mock('@/services/AegisAIService');

describe('useKpiDashboard', () => {
  const getFeedback = vi.fn();
  const getBot = vi.fn();
  let app: App | undefined;
  let service: {
    getBotKpiMetrics: typeof getBot;
    getKpiMetrics: typeof getFeedback;
    onBotKpiProgress?: (refreshedFlaws: number, selectedFlaws: number) => void;
  };

  beforeEach(() => {
    getFeedback.mockReset().mockResolvedValue({});
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    vi.mocked(AegisAIService).mockImplementation(function () {
      service = { getBotKpiMetrics: getBot, getKpiMetrics: getFeedback };
      return service as unknown as AegisAIService;
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

  it('starts with null bot progress and updates it from the service hook while loading', () => {
    const dashboard = mountDashboard();

    expect(dashboard.botProgress.value).toEqual({ refreshed: null, selected: null });
    expect(dashboard.loading.value).toBe(true);

    service.onBotKpiProgress!(10, 40);
    expect(dashboard.botProgress.value).toEqual({ refreshed: 10, selected: 40 });
  });

  it('resets bot progress when a new refresh starts and ignores progress from the superseded fetch', async () => {
    const dashboard = mountDashboard();
    service.onBotKpiProgress!(10, 40);
    const supersededHook = service.onBotKpiProgress!;

    dashboard.component.value = 'kernel';
    await flushPromises();

    expect(dashboard.botProgress.value).toEqual({ refreshed: null, selected: null });
    supersededHook(20, 40);
    expect(dashboard.botProgress.value).toEqual({ refreshed: null, selected: null });
    service.onBotKpiProgress!(5, 30);
    expect(dashboard.botProgress.value).toEqual({ refreshed: 5, selected: 30 });
  });

  it('ignores progress callbacks after the dashboard unmounts', () => {
    const dashboard = mountDashboard();
    service.onBotKpiProgress!(10, 40);
    expect(dashboard.botProgress.value).toEqual({ refreshed: 10, selected: 40 });

    app!.unmount();
    service.onBotKpiProgress!(20, 40);

    expect(dashboard.botProgress.value).toEqual({ refreshed: 10, selected: 40 });
  });
});
