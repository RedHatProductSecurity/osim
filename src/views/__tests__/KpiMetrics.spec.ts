import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountWithConfig } from '@/__tests__/helpers';
import KpiMetrics from '@/views/KpiMetrics.vue';
import { AegisAIService } from '@/services/AegisAIService';
import type { AegisBotKpiMetrics, AegisKpiMetrics } from '@/types/aegisAI';

vi.mock('@/services/AegisAIService');
vi.mock('vue-data-ui/vue-ui-xy', () => ({
  VueUiXy: { name: 'VueUiXy', props: ['dataset', 'config'], template: '<div class="chart-stub"></div>' },
}));

const feedback: AegisKpiMetrics = {
  'suggest-impact': {
    acceptance_percentage: 50,
    available_versions: ['0.9.2', '0.9.1'],
    entries: [
      { datetime: '2026-09-01 12:00:00', accepted: true, aegis_version: '0.9.2', feedback_source: 'manual' },
      { datetime: '2026-09-02 23:59:59.999', accepted: false, aegis_version: '0.9.1', feedback_source: 'programmatic' },
    ],
  },
};
const bot: AegisBotKpiMetrics = {
  total_flaws_processed: 1,
  available_components: ['kernel', 'openssl', 'kernel'],
  features: {
    impact: {
      suggested: 1,
      skipped: 1,
      kept: 1,
      modified: 0,
      acceptance_rate: 100,
      avg_data_quality: 0.8,
      avg_confidence: 0.9,
      avg_suggestion_deviation: 0,
    },
  },
  entries: [
    { cve_id: 'CVE-2026-1000',
      feature: 'impact',
      datetime: '2026-09-01T00:00:00Z',
      aegis_version: '',
      type: 'AI-Bot-Skipped',
      deviation: null,
      data_quality: null,
      confidence: null },
    { cve_id: 'CVE-2026-1000',
      feature: 'impact',
      datetime: '2026-09-02T00:00:00Z',
      aegis_version: '0.9.2',
      type: 'AI-Bot',
      deviation: 0,
      data_quality: 0.8,
      confidence: 0.9 },
  ],
};

describe('kPI dashboard', () => {
  let wrapper: VueWrapper;
  const getFeedback = vi.fn();
  const getBot = vi.fn();
  const mount = async () => {
    wrapper = mountWithConfig(KpiMetrics);
    await flushPromises();
  };
  const button = (text: string) => wrapper.findAll('button').find(item => item.text() === text)!;

  beforeEach(() => {
    getFeedback.mockReset().mockResolvedValue(feedback);
    getBot.mockReset().mockResolvedValue(bot);
    vi.mocked(AegisAIService).mockImplementation(() => ({
      getKpiMetrics: getFeedback, getBotKpiMetrics: getBot,
    }) as unknown as AegisAIService);
  });
  afterEach(() => wrapper?.unmount());

  it('combines both endpoints using observation counts and displays bot processing metrics', async () => {
    await mount();
    expect(getFeedback).toHaveBeenCalledWith('all', expect.objectContaining({ detail: true }));
    expect(getBot).toHaveBeenCalledWith(expect.objectContaining({ detail: true }));
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(wrapper.get('[data-testid="processed-flaws"]').text()).toContain('1 processed flaws');
    expect(wrapper.text()).toContain('Unknown version');
    expect(wrapper.text()).toContain('manual: 100.0%');
    expect(wrapper.text()).toContain('programmatic: 0.0%');
    expect(wrapper.text()).toContain('osidb-bot: 100.0%');
    expect(wrapper.get('tbody').text()).toContain('0.80');
  });

  it('shows a feature with no observations as empty, not a zero acceptance rate', async () => {
    await mount();
    await wrapper.get('#feature-select').setValue('suggest-cwe');
    expect(wrapper.text()).toContain('No KPI records match');
    expect(wrapper.find('[data-testid="overall-rate"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="processed-flaws"]').text()).toContain('0 processed flaws');
  });

  it('passes UTC inclusive date bounds and versions to both endpoints', async () => {
    await mount();
    await wrapper.get('#kpi-from').setValue('2026-09-01');
    await wrapper.get('#kpi-to').setValue('2026-09-02');
    await button('0.9.1').trigger('click');
    await flushPromises();
    const query = expect.objectContaining({
      aegis_version: ['0.9.1'],
      recorded_after: '2026-09-01T00:00:00.000Z',
      recorded_before: '2026-09-02T23:59:59.999Z',
    });
    expect(getFeedback).toHaveBeenLastCalledWith('all', query);
    expect(getBot).toHaveBeenLastCalledWith(query);
  });

  it('uses server-filtered feedback, including historical records absent from the initial response', async () => {
    await mount();
    getFeedback.mockResolvedValue({
      'suggest-impact': { acceptance_percentage: 100,
        entries: [
          { datetime: '2026-08-01 00:00:00', accepted: true, aegis_version: '0.9.1' },
        ] },
    });
    getBot.mockResolvedValue({ ...bot, entries: [], features: {}, total_flaws_processed: 0 });
    await button('0.9.1').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('100.0% — 1 of 1');
    expect(wrapper.findComponent({ name: 'VueUiXy' }).props('config').chart.grid.labels.xAxisLabels.values)
      .toEqual(['Week of 2026-07-27']);
  });

  it('labels partial results and preserves feedback when the bot endpoint fails', async () => {
    getBot.mockRejectedValue(new Error('Offline'));
    await mount();
    expect(wrapper.get('[role="alert"]').text()).toContain('osidb-bot metrics could not be loaded');
    expect(wrapper.text()).toContain('Available-source Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('50.0% — 1 of 2');
  });

  it('shows loading, empty and invalid-range states without NaN', async () => {
    getFeedback.mockResolvedValue({});
    getBot.mockResolvedValue({ ...bot, entries: [], features: {}, total_flaws_processed: 0 });
    wrapper = mountWithConfig(KpiMetrics);
    expect(wrapper.get('[role="status"]').text()).toContain('Loading');
    await flushPromises();
    expect(wrapper.text()).toContain('No KPI records match');
    expect(wrapper.text()).not.toContain('NaN');
    await wrapper.get('#kpi-from').setValue('2026-09-03');
    await flushPromises();
    const calls = getFeedback.mock.calls.length;
    await wrapper.get('#kpi-to').setValue('2026-09-01');
    await flushPromises();
    expect(getFeedback).toHaveBeenCalledTimes(calls);
    expect(wrapper.get('[role="alert"]').text()).toContain('start date must be on or before');
  });

  it('ignores an older response that finishes after a newer filter request', async () => {
    let resolveOld!: (value: AegisKpiMetrics) => void;
    getFeedback.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
    wrapper = mountWithConfig(KpiMetrics);
    await wrapper.get('#kpi-from').setValue('2026-09-01');
    await flushPromises();
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('2 of 3');
    resolveOld({});
    await flushPromises();
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('2 of 3');
  });
});
