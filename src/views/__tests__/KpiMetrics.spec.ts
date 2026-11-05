import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountWithConfig } from '@/__tests__/helpers';
import KpiMetrics from '@/views/KpiMetrics.vue';
import { AegisAIService } from '@/services/AegisAIService';
import type { AegisBotKpiMetrics, AegisKpiMetrics } from '@/types/aegisAI';
import { downloadKpiCsv } from '@/utils/kpiReport';

vi.mock('@/services/AegisAIService');
vi.mock('@/utils/kpiReport', async importOriginal => ({
  ...await importOriginal<typeof import('@/utils/kpiReport')>(), downloadKpiCsv: vi.fn(),
}));
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
  let serviceInstance: {
    getBotKpiMetrics: typeof getBot;
    getKpiMetrics: typeof getFeedback;
    onBotKpiProgress?: (refreshedFlaws: number, selectedFlaws: number) => void;
  };
  const mount = async () => {
    wrapper = mountWithConfig(KpiMetrics);
    await flushPromises();
  };
  const button = (text: string) => wrapper.findAll('button').find(item => item.text() === text)!;

  beforeEach(() => {
    vi.mocked(downloadKpiCsv).mockClear();
    getFeedback.mockReset().mockResolvedValue(feedback);
    getBot.mockReset().mockResolvedValue(bot);
    vi.mocked(AegisAIService).mockImplementation(function () {
      serviceInstance = { getBotKpiMetrics: getBot, getKpiMetrics: getFeedback };
      return serviceInstance as unknown as AegisAIService;
    });
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

  it('offers unique component suggestions and applies arbitrary component names to both sources', async () => {
    await mount();
    expect(wrapper.findAll('#kpi-components option').map(option => option.attributes('value')))
      .toEqual(['kernel', 'openssl']);
    await wrapper.get('#kpi-component').setValue('  kernel  ');
    await flushPromises();
    expect(getFeedback).toHaveBeenLastCalledWith('all', expect.objectContaining({ component: 'kernel' }));
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: 'kernel' }));
    await wrapper.get('#kpi-component').setValue('custom-component');
    await flushPromises();
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: 'custom-component' }));
    await wrapper.get('#kpi-component').setValue('');
    await flushPromises();
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: undefined }));
  });

  it('downloads the same scoped counts displayed on the dashboard', async () => {
    await mount();
    await wrapper.get('#kpi-component').setValue('kernel');
    await wrapper.get('#feature-select').setValue('suggest-impact');
    await flushPromises();
    await button('Download CSV').trigger('click');
    expect(downloadKpiCsv).toHaveBeenCalledOnce();
    const csv = vi.mocked(downloadKpiCsv).mock.calls[0][0];
    expect(csv).toContain('"kernel","suggest-impact"');
    expect(csv).toContain('"2","3","66.7"');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
  });

  it('disables complete-report downloads while loading or when either source fails', async () => {
    getBot.mockRejectedValue(new Error('Offline'));
    wrapper = mountWithConfig(KpiMetrics);
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    await flushPromises();
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
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

  it('restores the full chart, summaries and export when the last version is deselected (OSIDB-5154)', async () => {
    getFeedback.mockImplementation((_feature, query) => Promise.resolve(query.aegis_version
      ? { 'suggest-impact': { acceptance_percentage: 100, entries: [feedback['suggest-impact'].entries[0]] } }
      : feedback));
    getBot.mockImplementation(query => Promise.resolve(query.aegis_version
      ? { ...bot, entries: [], features: {}, total_flaws_processed: 0 }
      : bot));
    await mount();
    const originalDataset = wrapper.findComponent({ name: 'VueUiXy' }).props('dataset');
    await button('0.9.2').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('100.0% — 1 of 1');
    await button('0.9.2').trigger('click');
    await flushPromises();
    expect(button('0.9.2').attributes('aria-pressed')).toBe('false');
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ aegis_version: undefined }));
    expect(wrapper.findComponent({ name: 'VueUiXy' }).props('dataset')).toEqual(originalDataset);
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    await button('Download CSV').trigger('click');
    expect(vi.mocked(downloadKpiCsv).mock.calls[0][0]).toContain('"2","3","66.7"');
  });

  it('clears every filter together and restores the original API scope (OSIDB-5154)', async () => {
    await mount();
    await wrapper.get('#kpi-component').setValue('kernel');
    await wrapper.get('#feature-select').setValue('suggest-impact');
    await wrapper.get('#kpi-from').setValue('2026-09-01');
    await wrapper.get('#kpi-to').setValue('2026-09-02');
    await button('Unknown version').trigger('click');
    await flushPromises();
    await button('Clear All Filters').trigger('click');
    await flushPromises();
    expect((wrapper.get('#feature-select').element as HTMLSelectElement).value).toBe('all');
    expect((wrapper.get('#kpi-component').element as HTMLInputElement).value).toBe('');
    expect((wrapper.get('#kpi-from').element as HTMLInputElement).value).toBe('');
    expect(getFeedback).toHaveBeenLastCalledWith('all', {
      detail: true,
      component: undefined,
      aegis_version: undefined,
      recorded_after: undefined,
      recorded_before: undefined,
    });
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('2 of 3');
  });

  it('uses inclusive week bounds and preserves range controls across narrowing and reset', async () => {
    const multiWeek = { 'suggest-impact': { acceptance_percentage: 100,
      entries: [
        { datetime: '2026-08-01 00:00:00', accepted: true, aegis_version: '0.9.1' },
        ...feedback['suggest-impact'].entries,
        { datetime: '2026-10-01 00:00:00', accepted: true, aegis_version: '0.9.2' },
      ] } };
    getFeedback.mockResolvedValue(multiWeek);
    await mount();
    await wrapper.get('#kpi-range-start').setValue('5');
    await flushPromises();
    await wrapper.get('#kpi-range-end').setValue('5');
    await flushPromises();
    expect(getFeedback).toHaveBeenLastCalledWith('all', expect.objectContaining({
      recorded_after: '2026-08-31T00:00:00.000Z', recorded_before: '2026-09-06T23:59:59.999Z',
    }));
    getFeedback.mockResolvedValueOnce(feedback);
    await button('Refresh').trigger('click');
    await flushPromises();
    expect(wrapper.get('#kpi-range-end').attributes('max')).toBe('9');
    await button('Clear All Filters').trigger('click');
    await flushPromises();
    expect((wrapper.get('#kpi-range-start').element as HTMLInputElement).value).toBe('0');
    expect((wrapper.get('#kpi-range-end').element as HTMLInputElement).value).toBe('9');
  });

  it('keeps range controls usable for an empty date window between populated weeks', async () => {
    getFeedback.mockResolvedValue({ 'suggest-impact': { acceptance_percentage: 100,
      entries: [
        { datetime: '2026-08-01 00:00:00', accepted: true, aegis_version: '0.9.1' },
        ...feedback['suggest-impact'].entries,
      ] } });
    await mount();
    getFeedback.mockResolvedValue({});
    getBot.mockResolvedValue({ ...bot, entries: [], features: {}, total_flaws_processed: 0 });
    await wrapper.get('#kpi-from').setValue('2026-08-10');
    await wrapper.get('#kpi-to').setValue('2026-08-20');
    await flushPromises();
    expect((wrapper.get('#kpi-range-start').element as HTMLInputElement).value).toBe('2');
    expect((wrapper.get('#kpi-range-end').element as HTMLInputElement).value).toBe('3');
    await wrapper.get('#kpi-range-start').setValue('1');
    await flushPromises();
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ recorded_after: '2026-08-03T00:00:00.000Z' }));
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

  it.each([
    {
      name: 'expired authentication',
      reason: { response: { status: 401 }, message: 'Token expired' },
      detail: 'HTTP 401: Token expired',
      guidance: 'Sign in again',
    },
    {
      name: 'failed token refresh',
      reason: new Error('Unable to refresh access token'),
      detail: 'Unable to refresh access token',
      guidance: 'Sign in again',
    },
    {
      name: 'forbidden access',
      reason: { response: { status: 403 }, message: 'Access denied' },
      detail: 'HTTP 403: Access denied',
      guidance: 'Contact support',
    },
    {
      name: 'network failure',
      reason: { isNetworkError: true, message: 'Failed to fetch' },
      detail: 'Failed to fetch',
      guidance: 'Check your network connection',
    },
    {
      name: 'rate limiting',
      reason: { response: { status: 429 }, message: 'Request quota exceeded' },
      detail: 'HTTP 429: Request quota exceeded',
      guidance: 'Wait a moment',
    },
    {
      name: 'backend failure',
      reason: { response: { status: 503 }, message: 'Report service unavailable' },
      detail: 'HTTP 503: Report service unavailable',
      guidance: 'Select Refresh to try again',
    },
    {
      name: 'unconfigured backend',
      reason: { errorMsg: 'Backend not configured.', isConfigError: true },
      detail: 'Backend not configured.',
      guidance: 'Select Refresh to try again',
    },
    {
      name: 'status without a message',
      reason: { response: { status: 500 } },
      detail: 'HTTP 500',
      guidance: 'Select Refresh to try again',
    },
  ])('identifies the failed source and actionable details for $name', async ({ detail, guidance, reason }) => {
    getBot.mockRejectedValue(reason);
    await mount();
    const alert = wrapper.get('[role="alert"]').text();
    expect(alert).toContain('osidb-bot metrics could not be loaded');
    expect(alert).toContain(detail);
    expect(alert).toContain(guidance);
    expect(alert).not.toMatch(/server must|upgrad/i);
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('50.0% — 1 of 2');
  });

  it('explains that an unsupported detailed bot report requires a server upgrade', async () => {
    getBot.mockRejectedValue(new TypeError('The Aegis server does not support detailed bot KPI reports yet.'));
    await mount();
    const alert = wrapper.get('[role="alert"]').text();
    expect(alert).toContain('osidb-bot metrics could not be loaded');
    expect(alert).toContain('does not support detailed bot KPI reports yet');
    expect(alert).toContain('server must be upgraded');
    expect(alert).toContain('Loaded sources: Feedback.');
  });

  it('does not duplicate an HTTP status already included in the request error', async () => {
    getFeedback.mockRejectedValue({ response: { status: 500 }, message: 'HTTP 500: Database unavailable' });
    await mount();
    const alert = wrapper.get('[role="alert"]').text();
    expect(alert.match(/HTTP 500/g)).toHaveLength(1);
    expect(alert).toContain('Database unavailable');
  });

  it.each([null, undefined, 'unstructured rejection', 42, {}])(
    'provides a usable fallback for an unstructured error (%j)', async (reason) => {
      getFeedback.mockRejectedValue(reason);
      await mount();
      const alert = wrapper.get('[role="alert"]').text();
      expect(alert).toContain('Feedback metrics could not be loaded.');
      expect(alert).toContain('Select Refresh to try again.');
      expect(alert).not.toMatch(/undefined|null|\[object Object\]|upgrad/i);
      expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('100.0% — 1 of 1');
    },
  );

  it('renders request details as text rather than interpreting HTML', async () => {
    const detail = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    getBot.mockRejectedValue({ response: { status: 500 }, message: detail });
    await mount();
    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain(detail);
    expect(alert.find('img').exists()).toBe(false);
    expect(alert.find('script').exists()).toBe(false);
  });

  it.each([
    { failedSource: 'osidb-bot', loadedSource: 'Feedback', rate: '50.0% — 1 of 2' },
    { failedSource: 'Feedback', loadedSource: 'osidb-bot', rate: '100.0% — 1 of 1' },
  ])('shows only loaded totals when $failedSource fails and blocks export with a reason', async ({
    failedSource, loadedSource, rate,
  }) => {
    (failedSource === 'Feedback' ? getFeedback : getBot).mockRejectedValue(new Error('Service unavailable'));
    await mount();
    const alert = wrapper.get('[role="alert"]').text();
    expect(alert).toContain('Incomplete KPI results');
    expect(alert).toContain(`Loaded sources: ${loadedSource}.`);
    expect(alert).toContain('Charts and totals include only these sources and are incomplete');
    expect(alert).toContain(`${failedSource} metrics could not be loaded`);
    expect(wrapper.text()).toContain('Available-source Acceptance Rate');
    expect(wrapper.text()).not.toContain('Combined Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain(rate);
    expect(wrapper.findComponent({ name: 'VueUiXy' }).exists()).toBe(true);
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(failedSource === 'Feedback');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    expect(button('Download CSV').attributes('title')).toContain('until all KPI sources load successfully');
    await button('Download CSV').trigger('click');
    expect(downloadKpiCsv).not.toHaveBeenCalled();
  });

  it('replaces previous totals with an unavailable state when both sources fail', async () => {
    await mount();
    getFeedback.mockRejectedValue({ response: { status: 403 }, message: 'Feedback access denied' });
    getBot.mockRejectedValue({ isNetworkError: true, message: 'Bot unreachable' });
    await button('Refresh').trigger('click');
    await flushPromises();
    const alert = wrapper.get('[role="alert"]').text();
    expect(alert).toContain('KPI metrics unavailable');
    expect(alert).toContain('No KPI totals are available');
    expect(alert).toContain('Feedback metrics could not be loaded');
    expect(alert).toContain('Feedback access denied');
    expect(alert).toContain('osidb-bot metrics could not be loaded');
    expect(alert).toContain('Bot unreachable');
    expect(alert).not.toContain('Loaded sources:');
    expect(wrapper.text()).not.toContain('No KPI records match');
    expect(wrapper.find('[data-testid="overall-rate"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VueUiXy' }).exists()).toBe(false);
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    await button('Download CSV').trigger('click');
    expect(downloadKpiCsv).not.toHaveBeenCalled();
  });

  it.each(['Feedback', 'osidb-bot'])('labels empty loaded %s data as potentially incomplete', async (source) => {
    getFeedback.mockResolvedValue({});
    getBot.mockResolvedValue({ ...bot, entries: [], features: {}, total_flaws_processed: 0 });
    (source === 'Feedback' ? getBot : getFeedback).mockRejectedValue(new Error('Unavailable'));
    await mount();
    expect(wrapper.get('[role="alert"]').text()).toContain('Incomplete KPI results');
    expect(wrapper.get('[role="alert"]').text()).toContain(`Loaded sources: ${source}.`);
    expect(wrapper.text()).toContain('Records from the failed source may be missing');
    expect(wrapper.find('[data-testid="overall-rate"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VueUiXy' }).exists()).toBe(false);
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
  });

  it('keeps fully loaded empty results as a normal no-match state', async () => {
    getFeedback.mockResolvedValue({});
    getBot.mockResolvedValue({ ...bot, entries: [], features: {}, total_flaws_processed: 0 });
    await mount();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('No KPI records match these filters.');
    expect(wrapper.text()).not.toContain('may be missing');
    expect(wrapper.text()).not.toContain('unavailable');
    expect(wrapper.find('[data-testid="overall-rate"]').exists()).toBe(false);
  });

  it('retries the current filter scope and restores combined results and CSV after recovery', async () => {
    await mount();
    getBot.mockRejectedValue(new Error('Temporary outage'));
    await wrapper.get('#kpi-component').setValue('kernel');
    await wrapper.get('#feature-select').setValue('suggest-impact');
    await wrapper.get('#kpi-from').setValue('2026-09-01');
    await wrapper.get('#kpi-to').setValue('2026-09-02');
    await button('0.9.2').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('Incomplete KPI results');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('1 of 2');
    getFeedback.mockClear();
    let resolveRetry!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset().mockReturnValue(new Promise((resolve) => { resolveRetry = resolve; }));
    await button('Retry loading metrics').trigger('click');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[role="status"]').text()).toContain('Loading');
    resolveRetry(bot);
    await flushPromises();
    const query = {
      detail: true,
      component: 'kernel',
      aegis_version: ['0.9.2'],
      recorded_after: '2026-09-01T00:00:00.000Z',
      recorded_before: '2026-09-02T23:59:59.999Z',
    };
    expect(getFeedback).toHaveBeenCalledExactlyOnceWith('all', query);
    expect(getBot).toHaveBeenCalledExactlyOnceWith(query);
    expect((wrapper.get('#feature-select').element as HTMLSelectElement).value).toBe('suggest-impact');
    expect(button('0.9.2').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Combined Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
    expect(button('Download CSV').attributes('title')).toBeUndefined();
    await button('Download CSV').trigger('click');
    expect(downloadKpiCsv).toHaveBeenCalledOnce();
    expect(vi.mocked(downloadKpiCsv).mock.calls[0][0]).toContain('"kernel","suggest-impact"');
    expect(vi.mocked(downloadKpiCsv).mock.calls[0][0]).toContain('"2","3","66.7"');
  });

  it('ignores older failures after a newer filter scope has loaded successfully', async () => {
    let rejectFeedback!: (reason: unknown) => void;
    let rejectBot!: (reason: unknown) => void;
    getFeedback.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectFeedback = reject; }));
    getBot.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectBot = reject; }));
    wrapper = mountWithConfig(KpiMetrics);
    await wrapper.get('#kpi-component').setValue('kernel');
    await flushPromises();
    rejectFeedback(new Error('Obsolete feedback failure'));
    rejectBot({ response: { status: 401 }, message: 'Obsolete token' });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: 'kernel' }));
  });

  it('discards pending failures when a date change makes the range invalid', async () => {
    await mount();
    await wrapper.get('#kpi-from').setValue('2026-09-03');
    await flushPromises();
    let rejectFeedback!: (reason: unknown) => void;
    getFeedback.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectFeedback = reject; }));
    await button('Refresh').trigger('click');
    const calls = getFeedback.mock.calls.length;
    await wrapper.get('#kpi-to').setValue('2026-09-01');
    rejectFeedback(new Error('Outdated request failed'));
    await flushPromises();
    expect(getFeedback).toHaveBeenCalledTimes(calls);
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    expect(wrapper.get('[role="alert"]').text()).toContain('start date must be on or before');
    expect(wrapper.text()).not.toContain('Outdated request failed');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'VueUiXy' }).exists()).toBe(false);
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
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

  it('shows an accessible live progress bar while osidb-bot metrics refresh', async () => {
    let resolveBot!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset().mockReturnValue(new Promise((resolve) => { resolveBot = resolve; }));
    wrapper = mountWithConfig(KpiMetrics);
    expect(wrapper.get('[role="status"]').text()).toContain('Loading KPI metrics');
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);

    serviceInstance.onBotKpiProgress!(100, 400);
    await flushPromises();
    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.attributes('aria-label')).toBe('osidb-bot KPI refresh progress');
    expect(bar.attributes('aria-valuemin')).toBe('0');
    expect(bar.attributes('aria-valuemax')).toBe('100');
    expect(bar.attributes('aria-valuenow')).toBe('25');
    expect(wrapper.text()).toContain('Loading osidb-bot metrics… 100 / 400 flaws');
    const fill = bar.get('.progress-bar');
    expect(fill.attributes('style')).toContain('width: 25%');
    expect(fill.text()).toBe('25%');

    serviceInstance.onBotKpiProgress!(400, 400);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100');

    resolveBot(bot);
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
  });

  it('does not show a progress bar while loading without progress information', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    wrapper = mountWithConfig(KpiMetrics);
    expect(wrapper.get('[role="status"]').text()).toContain('Loading KPI metrics');
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
  });

  it('hides the progress bar for a zero-flaw selection', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    wrapper = mountWithConfig(KpiMetrics);
    serviceInstance.onBotKpiProgress!(5, 0);
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
  });

  it('caps the progress bar at 100 percent when the refreshed count exceeds the selection', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    wrapper = mountWithConfig(KpiMetrics);
    serviceInstance.onBotKpiProgress!(500, 400);
    await flushPromises();
    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.attributes('aria-valuenow')).toBe('100');
    expect(bar.get('.progress-bar').attributes('style')).toContain('width: 100%');
    expect(wrapper.text()).toContain('Loading osidb-bot metrics… 500 / 400 flaws');
  });

  it('ignores osidb-bot progress from a fetch superseded by a filter change', async () => {
    let resolveSuperseded!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset()
      .mockReturnValueOnce(new Promise((resolve) => { resolveSuperseded = resolve; }))
      .mockReturnValueOnce(new Promise(() => {}));
    wrapper = mountWithConfig(KpiMetrics);
    const supersededHook = serviceInstance.onBotKpiProgress!;
    supersededHook(100, 400);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');

    await wrapper.get('#kpi-component').setValue('kernel');
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);

    supersededHook(200, 400);
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);

    serviceInstance.onBotKpiProgress!(150, 600);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');
    expect(wrapper.text()).toContain('Loading osidb-bot metrics… 150 / 600 flaws');

    resolveSuperseded(bot);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');
  });
});
