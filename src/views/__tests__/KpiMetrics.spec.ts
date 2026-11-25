import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountWithConfig } from '@/__tests__/helpers';
import KpiMetrics from '@/views/KpiMetrics.vue';
import { AegisAIService } from '@/services/AegisAIService';
import type {
  AegisBotKpiCacheStatus, AegisBotKpiMetrics, AegisKpiMetrics, AegisKpiMetricsFeature,
} from '@/types/aegisAI';
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

// A cumulative snapshot whose last page reported cache-refresh progress.
const snapshot = (delivered: number, selected = 400): AegisBotKpiMetrics => ({
  ...bot,
  progress: { complete: delivered === selected, delivered_flaws: delivered, selected_flaws: selected },
});
// An intermediate snapshot whose pages carry no progress block: aggregate
// placeholders only, so no refresh counts are known.
const uncountedSnapshot: AegisBotKpiMetrics = {
  ...bot,
  aggregates_available: false,
  features: {},
  total_flaws_processed: 0,
};

const cacheStatus: AegisBotKpiCacheStatus = {
  fresh_count: 3,
  outdated_count: 1,
  stale_count: 2,
  total_flaws_selected: 5,
  uncached_count: 1,
};

describe('kPI dashboard', () => {
  let wrapper: VueWrapper;
  const getFeedback = vi.fn();
  const getBot = vi.fn();
  // Resolves null so the auxiliary cache-status text stays out of the
  // pre-existing rendering assertions; cache-status behavior has its own tests.
  const getCacheStatus = vi.fn();
  // Resolves an all-fresh cache so the drain completes in one poll and the
  // pre-existing assertions are unaffected; drain behavior has its own tests.
  const refreshCache = vi.fn();
  const mount = async () => {
    wrapper = mountWithConfig(KpiMetrics);
    await flushPromises();
  };
  const button = (text: string) => wrapper.findAll('button').find(item => item.text() === text)!;

  beforeEach(() => {
    vi.mocked(downloadKpiCsv).mockClear();
    getFeedback.mockReset().mockResolvedValue(feedback);
    getBot.mockReset().mockResolvedValue(bot);
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
    wrapper?.unmount();
    vi.useRealTimers();
  });

  it('combines both endpoints using observation counts and displays bot processing metrics', async () => {
    await mount();
    expect(getFeedback).toHaveBeenCalledWith('all', expect.objectContaining({ detail: true }), expect.any(AbortSignal));
    expect(getBot).toHaveBeenCalledWith(expect.objectContaining({ detail: true }), expect.objectContaining({
      signal: expect.any(AbortSignal), onSnapshot: expect.any(Function),
    }));
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(wrapper.get('[data-testid="processed-flaws"]').text()).toContain('1 processed flaws');
    expect(wrapper.text()).toContain('Unknown version');
    expect(wrapper.text()).toContain('Legacy Manual: 100.0%');
    expect(wrapper.text()).toContain('Requested by User: 0.0%');
    expect(wrapper.text()).toContain('Automated (OSIDB Bot): 100.0%');
    expect(wrapper.get('tbody').text()).toContain('0.80');
  });

  it('tooltips each By Source entry with its provenance and leaves unknown sources bare', async () => {
    // A source the frontend does not recognize still renders, just without a tooltip.
    const unrecognizedSourceEntry = {
      datetime: '2026-09-01 12:00:00',
      accepted: true,
      aegis_version: '0.9.2',
      feedback_source: 'legacy-form',
    } as unknown as AegisKpiMetricsFeature['entries'][number];
    getFeedback.mockResolvedValue({
      'suggest-impact': {
        acceptance_percentage: 50,
        entries: [
          { datetime: '2026-09-01 12:00:00', accepted: true, aegis_version: '0.9.2' },
          { datetime: '2026-09-01 12:00:00', accepted: true, aegis_version: '0.9.2', feedback_source: 'manual' },
          { datetime: '2026-09-01 12:00:00', accepted: false, aegis_version: '0.9.2', feedback_source: 'programmatic' },
          unrecognizedSourceEntry,
        ],
      },
    });
    await mount();
    const bySource = wrapper.findAll('ul')[1].findAll('li');
    const titles = new Map(bySource.map(item => [item.text().split(':')[0], item.attributes('title')]));

    expect([...titles.keys()]).toEqual([
      'Google Form', 'Legacy Manual', 'Requested by User', 'legacy-form', 'Automated (OSIDB Bot)',
    ]);
    expect(titles.get('Google Form')).toContain('early Google Form');
    expect(titles.get('Legacy Manual')).toContain('rating buttons');
    expect(titles.get('Requested by User')).toContain('Recorded automatically');
    expect(titles.get('Automated (OSIDB Bot)')).toContain('current OSIDB flaw values');
    expect(titles.get('legacy-form')).toBeUndefined();
  });

  it('offers unique component suggestions and applies arbitrary component names to both sources', async () => {
    await mount();
    expect(wrapper.findAll('#kpi-components option').map(option => option.attributes('value')))
      .toEqual(['kernel', 'openssl']);
    await wrapper.get('#kpi-component').setValue('  kernel  ');
    await flushPromises();
    expect(getFeedback).toHaveBeenLastCalledWith(
      'all', expect.objectContaining({ component: 'kernel' }), expect.any(AbortSignal),
    );
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: 'kernel' }), expect.any(Object));
    await wrapper.get('#kpi-component').setValue('custom-component');
    await flushPromises();
    expect(getBot).toHaveBeenLastCalledWith(
      expect.objectContaining({ component: 'custom-component' }), expect.any(Object),
    );
    await wrapper.get('#kpi-component').setValue('');
    await flushPromises();
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: undefined }), expect.any(Object));
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
    // Feedback and bot counts split across their columns, with the combined rate last.
    expect(csv).toContain('"1","1","2","50.0","1","1","1","0","1","100.0","66.7","1"');
    // The export uses channel names even though the list renders labels.
    expect(csv).toContain('"legacy_manual","suggest-impact"');
    expect(csv).toContain('"requested_by_user","suggest-impact"');
    expect(csv).toContain('"osidb_bot","suggest-impact"');
    expect(csv).not.toContain('"manual"');
    expect(csv).not.toContain('"programmatic"');
    expect(csv).not.toContain('"osidb-bot"');
    expect(csv).not.toContain('Legacy Manual');
    expect(csv).not.toContain('Requested by User');
    expect(csv).not.toContain('Automated (OSIDB Bot)');
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
    expect(getFeedback).toHaveBeenLastCalledWith('all', query, expect.any(AbortSignal));
    expect(getBot).toHaveBeenLastCalledWith(query, expect.any(Object));
  });

  it('closes an open-ended window at the request moment for both sources', async () => {
    const requestedAt = new Date('2026-11-12T12:00:00.000Z');
    vi.useFakeTimers({ toFake: ['Date'], now: requestedAt });
    await mount();
    expect(getFeedback.mock.calls[0][1].recorded_before).toBe(requestedAt.toISOString());
    expect(getBot.mock.calls[0][0].recorded_before).toBe(requestedAt.toISOString());
  });

  it('caps a start-only date window at the request moment', async () => {
    const requestedAt = new Date('2026-11-12T12:00:00.000Z');
    vi.useFakeTimers({ toFake: ['Date'], now: requestedAt });
    await mount();
    await wrapper.get('#kpi-from').setValue('2026-09-01');
    await flushPromises();
    const query = {
      detail: true,
      component: undefined,
      aegis_version: undefined,
      recorded_after: '2026-09-01T00:00:00.000Z',
      recorded_before: requestedAt.toISOString(),
    };
    expect(getFeedback).toHaveBeenLastCalledWith('all', query, expect.any(AbortSignal));
    expect(getBot).toHaveBeenLastCalledWith(query, expect.any(Object));
  });

  it('keeps an explicit Through date ahead of the request-moment cap', async () => {
    const requestedAt = new Date('2026-11-12T12:00:00.000Z');
    vi.useFakeTimers({ toFake: ['Date'], now: requestedAt });
    await mount();
    await wrapper.get('#kpi-to').setValue('2026-12-24');
    await flushPromises();
    expect(getFeedback).toHaveBeenLastCalledWith('all', expect.objectContaining({
      recorded_before: '2026-12-24T23:59:59.999Z',
    }), expect.any(AbortSignal));
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({
      recorded_before: '2026-12-24T23:59:59.999Z',
    }), expect.any(Object));
  });

  it('recaps the window at the request moment of each manual refresh', async () => {
    const firstMoment = new Date('2026-11-12T12:00:00.000Z');
    vi.useFakeTimers({ toFake: ['Date'], now: firstMoment });
    await mount();
    expect(getBot.mock.calls[0][0].recorded_before).toBe(firstMoment.toISOString());
    vi.setSystemTime(new Date('2026-11-12T12:05:00.000Z'));
    await button('Refresh').trigger('click');
    await flushPromises();
    expect(getFeedback.mock.lastCall![1].recorded_before).toBe('2026-11-12T12:05:00.000Z');
    expect(getBot.mock.lastCall![0].recorded_before).toBe('2026-11-12T12:05:00.000Z');
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
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ aegis_version: undefined }), expect.any(Object));
    expect(wrapper.findComponent({ name: 'VueUiXy' }).props('dataset')).toEqual(originalDataset);
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    await button('Download CSV').trigger('click');
    expect(vi.mocked(downloadKpiCsv).mock.calls[0][0])
      .toContain('"1","1","2","50.0","1","1","1","0","1","100.0","66.7","1"');
  });

  it('clears every filter together and restores the original API scope (OSIDB-5154)', async () => {
    const requestedAt = new Date('2026-11-12T12:00:00.000Z');
    vi.useFakeTimers({ toFake: ['Date'], now: requestedAt });
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
      recorded_before: requestedAt.toISOString(),
    }, expect.any(AbortSignal));
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('2 of 3');
  });

  it('renders no history-window sliders and keeps the date inputs driving the filters', async () => {
    const multiWeek = { 'suggest-impact': { acceptance_percentage: 100,
      entries: [
        { datetime: '2026-08-01 00:00:00', accepted: true, aegis_version: '0.9.1' },
        ...feedback['suggest-impact'].entries,
        { datetime: '2026-10-01 00:00:00', accepted: true, aegis_version: '0.9.2' },
      ] } };
    getFeedback.mockResolvedValue(multiWeek);
    await mount();
    expect(wrapper.find('#kpi-range-start').exists()).toBe(false);
    expect(wrapper.find('#kpi-range-end').exists()).toBe(false);
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('History window');
    await wrapper.get('#kpi-from').setValue('2026-09-01');
    await wrapper.get('#kpi-to').setValue('2026-09-02');
    await flushPromises();
    expect(getFeedback).toHaveBeenLastCalledWith('all', expect.objectContaining({
      recorded_after: '2026-09-01T00:00:00.000Z', recorded_before: '2026-09-02T23:59:59.999Z',
    }), expect.any(AbortSignal));
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({
      recorded_after: '2026-09-01T00:00:00.000Z', recorded_before: '2026-09-02T23:59:59.999Z',
    }), expect.any(Object));
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
    expect(getFeedback).toHaveBeenCalledExactlyOnceWith('all', query, expect.any(AbortSignal));
    expect(getBot).toHaveBeenCalledExactlyOnceWith(query, expect.any(Object));
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
    expect(vi.mocked(downloadKpiCsv).mock.calls[0][0])
      .toContain('"1","1","2","50.0","1","1","1","0","1","100.0","66.7","1"');
  });

  it('ignores older failures after a newer filter scope has loaded successfully', async () => {
    let rejectFeedback!: (reason: unknown) => void;
    let rejectBot!: (reason: unknown) => void;
    getFeedback.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectFeedback = reject; }));
    getBot.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectBot = reject; }));
    wrapper = mountWithConfig(KpiMetrics);
    // Let the initial scope's bot fetch start (the cache drain defers it one
    // tick) so the filter change below supersedes it, not the other way round.
    await flushPromises();
    await wrapper.get('#kpi-component').setValue('kernel');
    await flushPromises();
    rejectFeedback(new Error('Obsolete feedback failure'));
    rejectBot({ response: { status: 401 }, message: 'Obsolete token' });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
    expect(getBot).toHaveBeenLastCalledWith(expect.objectContaining({ component: 'kernel' }), expect.any(Object));
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

  const publish = (metrics: AegisBotKpiMetrics, call = 0) => getBot.mock.calls[call][1].onSnapshot(metrics);

  it('shows immediate zero progress before either endpoint responds, then actual delivery counts', async () => {
    let resolveBot!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset().mockReturnValue(new Promise((resolve) => { resolveBot = resolve; }));
    getFeedback.mockReturnValue(new Promise(() => {}));
    wrapper = mountWithConfig(KpiMetrics);
    await flushPromises();
    expect(wrapper.text()).toContain('0 flaws received; awaiting the first page');
    expect(wrapper.text()).not.toContain('of ~');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    publish(snapshot(0, 1600));
    await flushPromises();
    // The bar follows the exact delivery counts: nothing delivered yet.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0');
    expect(wrapper.text()).toContain('0 / 1600 flaws received');
    publish(snapshot(100, 1600));
    await flushPromises();
    const bar = wrapper.get('[role="progressbar"]');
    expect(bar.attributes('aria-label')).toBe('osidb-bot KPI refresh progress');
    expect(bar.attributes('aria-valuemin')).toBe('0');
    expect(bar.attributes('aria-valuemax')).toBe('100');
    expect(bar.attributes('aria-valuenow')).toBe('6');
    expect(wrapper.text()).toContain('100 / 1600 flaws received');
    const fill = bar.get('.progress-bar');
    expect(fill.attributes('style')).toContain('width: 6%');
    expect(fill.text()).toBe('6%');
    publish(snapshot(800, 1600));
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50');
    // The completed delivery hides the bar while the status text remains.
    const final = snapshot(1600, 1600);
    publish(final);
    await flushPromises();
    expect(wrapper.find('.progress').exists()).toBe(false);
    expect(wrapper.text()).toContain('1600 / 1600 flaws received');
    resolveBot(final);
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Loading feedback metrics');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('100.0% — 1 of 1');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
  });

  it('renders feedback immediately while bot network response is pending', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    await mount();
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('50.0% — 1 of 2');
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    expect(wrapper.text()).toContain('0 flaws received');
    expect(wrapper.text()).not.toContain('Loading feedback metrics');
  });

  it('shows an empty refreshed snapshot without inventing records or NaN', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    getFeedback.mockResolvedValue({});
    await mount();
    publish({ ...snapshot(0), entries: [], features: {}, total_flaws_processed: 0 });
    await flushPromises();
    // Nothing delivered of the 400-flaw selection: the bar stays at zero
    // instead of inventing a determinate value.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0');
    expect(wrapper.text()).toContain('No KPI records received yet');
    expect(wrapper.text()).not.toMatch(/NaN|90%/);
  });

  it.each([409, 410, 500])('retains refreshed details and partial averages after HTTP %s', async (status) => {
    let rejectBot!: (reason: unknown) => void;
    getBot.mockReturnValue(new Promise((_resolve, reject) => { rejectBot = reject; }));
    await mount();
    publish(snapshot(1, 5));
    await flushPromises();
    rejectBot({ response: { status }, message: 'Run stopped' });
    await flushPromises();
    expect(wrapper.text()).toContain('Incomplete osidb-bot metrics: 1 / 5 selected flaws received');
    expect(wrapper.text()).toContain('Charts and totals cover only received data');
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(wrapper.get('[data-testid="processed-flaws"]').text())
      .toContain('1 processed flaws in the received portion');
    expect(wrapper.get('tbody').text()).toContain('0.80');
    expect(wrapper.text()).toContain('Run stopped');
    if (status !== 500) expect(wrapper.text()).toContain('expired or was invalidated');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    getBot.mockResolvedValue(bot);
    await button('Refresh').trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Incomplete osidb-bot metrics');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
  });

  it('keeps legacy intermediate details but hides unavailable aggregates and unknown refresh counts', async () => {
    let rejectBot!: (reason: unknown) => void;
    getBot.mockReturnValue(new Promise((_resolve, reject) => { rejectBot = reject; }));
    await mount();
    publish(uncountedSnapshot);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(wrapper.text()).toContain('Flaw delivery counts unavailable from this server.');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('2 of 3');
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    expect(wrapper.find('tbody').exists()).toBe(false);
    rejectBot(new Error('Offline'));
    await flushPromises();
    expect(wrapper.text()).toContain('Aggregate bot metrics are unavailable without a completed run');
    expect(wrapper.text()).toContain('The server does not report how many selected flaws have been delivered.');
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
  });

  it('aborts obsolete scope and ignores its snapshots after a filter change', async () => {
    let resolveSuperseded!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset()
      .mockReturnValueOnce(new Promise((resolve) => { resolveSuperseded = resolve; }))
      .mockReturnValueOnce(new Promise(() => {}));
    wrapper = mountWithConfig(KpiMetrics);
    await flushPromises();
    const supersededOptions = getBot.mock.calls[0][1];
    const feedbackSignal = getFeedback.mock.calls[0][2];
    publish(snapshot(100, 800));
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('13');

    await wrapper.get('#kpi-component').setValue('kernel');
    await flushPromises();
    expect(supersededOptions.signal.aborted).toBe(true);
    expect(feedbackSignal.aborted).toBe(true);
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    supersededOptions.onSnapshot(snapshot(200, 800));
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    publish(snapshot(150, 600), 1);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');
    expect(wrapper.text()).toContain('Loading osidb-bot metrics… 150 / 600 flaws received');

    resolveSuperseded(bot);
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25');
  });

  it('renders a genuinely indeterminate bar while the refresh counts are unknown', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    await mount();
    let fill = wrapper.get('[role="progressbar"] .progress-bar');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(fill.classes()).toContain('kpi-progress-indeterminate');
    expect(fill.classes()).not.toContain('progress-bar-striped');
    expect(fill.attributes('style')).toBeUndefined();
    expect(fill.text()).toBe('');

    // A page without a progress block leaves the counts unknown.
    publish(uncountedSnapshot);
    await flushPromises();
    expect(wrapper.text()).toContain('Flaw delivery counts unavailable from this server.');
    fill = wrapper.get('[role="progressbar"] .progress-bar');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(fill.classes()).toContain('kpi-progress-indeterminate');
    expect(fill.attributes('style')).toBeUndefined();

    publish(snapshot(100, 1600));
    await flushPromises();
    const determinate = wrapper.get('[role="progressbar"] .progress-bar');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('6');
    expect(determinate.classes()).not.toContain('kpi-progress-indeterminate');
    expect(determinate.classes()).toContain('progress-bar-striped');
    expect(determinate.attributes('style')).toContain('width: 6%');
    expect(determinate.text()).toBe('6%');
  });

  it('keeps the bar indeterminate for an empty selection instead of completing it', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    getCacheStatus.mockResolvedValueOnce({
      ...cacheStatus, fresh_count: 0, outdated_count: 0, stale_count: 0, total_flaws_selected: 0, uncached_count: 0,
    });
    await mount();
    expect(wrapper.text()).toContain('No flaws match the current selection.');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(wrapper.get('[role="progressbar"] .progress-bar').classes()).toContain('kpi-progress-indeterminate');
    // A page reporting an empty selection keeps the bar indeterminate: with
    // no total to project there is no delivery to measure.
    publish({ ...snapshot(0, 0), entries: [], features: {}, total_flaws_processed: 0 });
    await flushPromises();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(wrapper.get('[role="progressbar"] .progress-bar').classes()).toContain('kpi-progress-indeterminate');
  });

  it('uses the cache-status total as the fallback denominator until the run reports its own', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    getCacheStatus.mockResolvedValueOnce({ ...cacheStatus, fresh_count: 1998, total_flaws_selected: 2000 });
    await mount();
    // Before the first page, the cache-status total already sizes the counts,
    // but with no pages delivered the bar stays indeterminate.
    expect(wrapper.text()).toContain('0 / 2000 flaws received');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(wrapper.get('[role="progressbar"] .progress-bar').classes()).toContain('kpi-progress-indeterminate');

    // A page without progress keeps the cache-status denominator in the
    // notice, but with no delivered count the bar stays indeterminate.
    publish(uncountedSnapshot);
    await flushPromises();
    expect(wrapper.text()).toContain('Flaw delivery counts unavailable from this server (2000 flaws selected).');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(wrapper.get('[role="progressbar"] .progress-bar').classes()).toContain('kpi-progress-indeterminate');

    // The run's own selection total is authoritative once progress reports
    // it, and the exact ratio drives the bar.
    publish(snapshot(2, 10));
    await flushPromises();
    expect(wrapper.text()).toContain('2 / 10 flaws received');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('20');
  });

  it('sizes the unavailable-counts notice with the cache-status total', async () => {
    getBot.mockReset().mockReturnValue(new Promise(() => {}));
    getCacheStatus.mockResolvedValueOnce(cacheStatus);
    await mount();
    publish(uncountedSnapshot);
    await flushPromises();
    expect(wrapper.text()).toContain('Flaw delivery counts unavailable from this server (5 flaws selected).');
    // Without delivered counts the bar stays indeterminate rather than
    // inventing a completion.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
  });

  it.each([
    {
      name: 'a fully fresh cache',
      status: { ...cacheStatus, fresh_count: 5, stale_count: 0, outdated_count: 0, uncached_count: 0 },
      text: 'All 5 selected flaws are cached fresh.',
    },
    {
      name: 'a partially stale cache',
      status: cacheStatus,
      text: '2 of 5 selected flaws are not cached fresh (1 uncached, 1 changed in OSIDB).',
    },
    {
      name: 'an empty selection',
      status: {
        ...cacheStatus,
        fresh_count: 0,
        stale_count: 0,
        outdated_count: 0,
        total_flaws_selected: 0,
        uncached_count: 0,
      },
      text: 'No flaws match the current selection.',
    },
    {
      name: 'a cold cache with no fresh flaws yet',
      status: {
        ...cacheStatus,
        fresh_count: 0,
        stale_count: 4,
        outdated_count: 0,
        total_flaws_selected: 4,
        uncached_count: 4,
      },
      text: '4 of 4 selected flaws are not cached fresh (4 uncached, 0 changed in OSIDB).',
    },
    {
      name: 'a cache stale only from OSIDB changes',
      status: { ...cacheStatus, fresh_count: 2, stale_count: 3, outdated_count: 3, uncached_count: 0 },
      text: '3 of 5 selected flaws are not cached fresh (0 uncached, 3 changed in OSIDB).',
    },
  ])('renders $name as plain text appended to the loading line (AEGIS-550)', async ({ status, text }) => {
    let resolveBot!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset().mockReturnValueOnce(new Promise((resolve) => { resolveBot = resolve; }));
    getCacheStatus.mockResolvedValueOnce(status);
    await mount();
    expect(wrapper.get('span[role="status"]').text()).toContain(text);
    expect(wrapper.find('.badge').exists()).toBe(false);

    resolveBot(bot);
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain(text);
    expect(wrapper.find('.badge').exists()).toBe(false);
  });

  it('omits the cache status text entirely while no cache status is available', async () => {
    await mount();
    expect(wrapper.find('.badge').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('cached fresh');
    expect(wrapper.text()).not.toContain('No flaws match the current selection');
    expect(wrapper.text()).not.toContain('could not be loaded');
  });

  it('replaces the cache status text with each refreshed selection and removes it once loaded', async () => {
    let resolveBot!: (value: AegisBotKpiMetrics) => void;
    getBot.mockReset().mockReturnValueOnce(new Promise((resolve) => { resolveBot = resolve; }));
    getCacheStatus.mockResolvedValueOnce(cacheStatus);
    await mount();
    expect(wrapper.get('span[role="status"]').text())
      .toContain('2 of 5 selected flaws are not cached fresh (1 uncached, 1 changed in OSIDB).');

    resolveBot(bot);
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('not cached fresh');

    getBot.mockReturnValueOnce(new Promise(() => {}));
    getCacheStatus.mockResolvedValueOnce({
      ...cacheStatus, fresh_count: 5, stale_count: 0, outdated_count: 0, uncached_count: 0,
    });
    await button('Refresh').trigger('click');
    await flushPromises();
    expect(wrapper.get('span[role="status"]').text()).toContain('All 5 selected flaws are cached fresh.');

    getBot.mockReturnValueOnce(new Promise(() => {}));
    getCacheStatus.mockReturnValueOnce(new Promise(() => {}));
    await wrapper.get('#kpi-component').setValue('kernel');
    await flushPromises();
    expect(wrapper.text()).not.toContain('cached fresh');
    expect(wrapper.text()).toContain('0 flaws received; awaiting the first page');
    expect(wrapper.find('.badge').exists()).toBe(false);
  });

  it('repeats the cache status inside the incomplete warning only after the failed load ends', async () => {
    let rejectBot!: (reason: unknown) => void;
    getBot.mockReset().mockReturnValueOnce(new Promise((_resolve, reject) => { rejectBot = reject; }));
    getCacheStatus.mockResolvedValueOnce(cacheStatus);
    const stale = '2 of 5 selected flaws are not cached fresh (1 uncached, 1 changed in OSIDB).';
    await mount();
    publish(snapshot(1, 5));
    await flushPromises();
    // While the run is still loading only the loading line shows, with the
    // cache status separated from the page estimate like the other fragments.
    expect(wrapper.find('p[role="status"]').exists()).toBe(false);
    const line = wrapper.get('span[role="status"]').text();
    expect(line).toContain('1 / 5 flaws received');
    expect(line).toContain(`· ${stale}`);

    rejectBot({ response: { status: 500 }, message: 'Run stopped' });
    await flushPromises();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    const failed = wrapper.get('p[role="status"]');
    expect(failed.text()).toContain('Incomplete osidb-bot metrics: 1 / 5 selected flaws received');
    expect(failed.text()).toContain(`Cache status when the run started: ${stale}`);
    expect(failed.text()).toContain('Select Refresh to start a new run.');
    expect(failed.find('.badge').exists()).toBe(false);
  });

  it('leaves the cache status absent and unreported on a 404 from an older Aegis server (AEGIS-550)', async () => {
    getCacheStatus.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
    await mount();
    expect(wrapper.find('.badge').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('cached fresh');
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('could not be loaded');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
  });

  it.each([
    {
      name: 'expired authentication',
      reason: { response: { status: 401 }, message: 'Token expired' },
      detail: 'HTTP 401: Token expired',
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
      name: 'a failure without an HTTP status',
      reason: new Error('Offline'),
      detail: 'Offline',
      guidance: 'Select Refresh to try again',
    },
  ])('reports $name on the cache status without gating the dashboard', async ({ detail, guidance, reason }) => {
    getCacheStatus.mockRejectedValueOnce(reason);
    await mount();
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1);
    const alert = wrapper.get('[role="alert"]');
    expect(alert.classes()).toEqual(expect.arrayContaining(['alert', 'alert-warning']));
    expect(alert.text()).toContain('The osidb-bot KPI cache status could not be loaded');
    expect(alert.text()).toContain(detail);
    expect(alert.text()).toContain(guidance);
    expect(wrapper.text()).not.toContain('Incomplete KPI results');
    expect(wrapper.text()).toContain('Combined Acceptance Rate');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
    expect(button('Download CSV').attributes('title')).toBeUndefined();
  });

  it('keeps the CSV download working when only the cache status fails (AEGIS-550)', async () => {
    getCacheStatus.mockRejectedValueOnce({ response: { status: 500 }, message: 'Cache read failed' });
    await mount();
    await button('Download CSV').trigger('click');
    expect(downloadKpiCsv).toHaveBeenCalledOnce();
  });

  it('keeps a cache status failure out of the shared metric-source error block', async () => {
    getBot.mockRejectedValue(new Error('Offline'));
    getCacheStatus.mockRejectedValueOnce({ response: { status: 500 }, message: 'Cache read failed' });
    await mount();
    const cacheAlert = wrapper.get('p[role="alert"]');
    expect(cacheAlert.text()).toContain('The osidb-bot KPI cache status could not be loaded');
    const sourceAlert = wrapper.get('div[role="alert"]');
    expect(sourceAlert.text()).toContain('Incomplete KPI results');
    expect(sourceAlert.text()).toContain('osidb-bot metrics could not be loaded');
    expect(sourceAlert.text()).not.toContain('KPI cache status');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
  });

  it('renders results and keeps the CSV export available while the cache status is pending', async () => {
    getCacheStatus.mockReturnValue(new Promise(() => {}));
    await mount();
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('66.7% — 2 of 3');
    expect(wrapper.text()).toContain('Combined Acceptance Rate');
    expect(wrapper.text()).not.toContain('cached fresh');
    expect(wrapper.find('.badge').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
  });
});
