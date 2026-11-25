import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

import { encodeJWT, mountWithConfig } from '@/__tests__/helpers';
import { botEntries, botEntry, botFeatures, botPage, deferred } from '@/__tests__/kpiDeliveryFixtures';
import { server } from '@/__tests__/setup';
import { useAuthStore } from '@/stores/AuthStore';
import { osimRuntime } from '@/stores/osimRuntime';
import KpiMetrics from '@/views/KpiMetrics.vue';

vi.mock('vue-data-ui/vue-ui-xy', () => ({
  VueUiXy: { name: 'VueUiXy', props: ['dataset', 'config'], template: '<div class="chart-stub"></div>' },
}));

const baseUrl = 'http://localhost:8080';
const feedback = { 'suggest-impact': { acceptance_percentage: 100,
  entries: [{ datetime: '2026-09-01 12:00:00', accepted: true, aegis_version: '0.9.2' }] } };

describe('rendered KPI pagination with real service and HTTP', () => {
  let wrapper: undefined | VueWrapper;
  let pinia: ReturnType<typeof createPinia>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  const gates: ReturnType<typeof deferred<void>>[] = [];
  const gate = () => {
    const value = deferred();
    gates.push(value);
    return value;
  };
  const button = (text: string) => wrapper!.findAll('button').find(item => item.text() === text)!;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    pinia = createPinia();
    setActivePinia(pinia);
    useAuthStore().accessToken = encodeJWT({ exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1337 });
    // @ts-expect-error Runtime configuration is read-only outside tests.
    osimRuntime.value.backends.aegisai = baseUrl;
    // The dashboard also queries the read-only cache-status endpoint; a fresh
    // cache keeps its status text out of the assertions below.
    server.use(
      http.get(`${baseUrl}/analysis/kpi/osidb-bot/cache-status`, () => HttpResponse.json({
        fresh_count: 2, outdated_count: 0, stale_count: 0, total_flaws_selected: 2, uncached_count: 0,
      })),
    );
  });
  afterEach(async () => {
    wrapper?.unmount();
    wrapper = undefined;
    gates.splice(0).forEach(value => value.resolve());
    await flushPromises();
    vi.useRealTimers();
    consoleError.mockRestore();
  });

  it('renders live pagination progress and retains partial snapshots on failure', async () => {
    const firstGate = gate();
    const secondGate = gate();
    const failureGate = gate();
    const feedbackGate = gate();
    const entries = [botEntry('CVE-2026-1000'), botEntry('CVE-2026-1000', 'cwe')];
    const first = botPage(entries, 'second', { complete: false, refreshed_flaws: 2, selected_flaws: 1000 });
    const second = botPage([botEntry('CVE-2026-1001')], 'third',
      { complete: false, refreshed_flaws: 9, selected_flaws: 1000 });
    const pages = [first, second];
    const pageGates = [firstGate, secondGate, failureGate];
    const requests: Request[] = [];
    server.use(
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        const index = requests.push(request) - 1;
        await pageGates[index].promise;
        return index === 2
          ? HttpResponse.json({ detail: 'Run invalidated' }, { status: 409 })
          : HttpResponse.json(pages[index]);
      }),
      http.get(`${baseUrl}/analysis/kpi/cve`, async () => {
        await feedbackGate.promise;
        return HttpResponse.json(feedback);
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    expect(wrapper.text()).toContain('0 flaws refreshed; awaiting the first page');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    feedbackGate.resolve();
    await vi.waitFor(() => expect(wrapper!.get('[data-testid="overall-rate"]').text()).toContain('1 of 1'));
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    firstGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(wrapper.text()).toContain('2 / 1000 flaws refreshed');
    // The bar tracks delivered pages, not the refreshed count: one page of
    // the three projected for the 1000-flaw selection.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('33');
    expect(wrapper.get('span[role="status"]').text()).toContain('· All 2 selected flaws are cached fresh.');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('3 of 3');
    // Intermediate snapshots hide placeholder aggregates.
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    expect(wrapper.find('tbody').exists()).toBe(false);
    secondGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(wrapper.text()).toContain('9 / 1000 flaws refreshed');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('67');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('4 of 4');
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    failureGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Run invalidated'));
    const warning = wrapper.get('p[role="status"]');
    expect(warning.text()).toContain('Incomplete osidb-bot metrics: 9 / 1000 selected flaws refreshed');
    expect(warning.text()).toContain('Aggregate bot metrics are unavailable without a completed run');
    expect(warning.text()).toContain('Select Refresh to start a new run.');
    expect(wrapper.text()).toContain('expired or was invalidated');
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('4 of 4');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(requests).toHaveLength(3);
  });

  it('streams a fully cached run as warm pages without mistaking complete progress for delivery', async () => {
    const firstGate = gate();
    const lastGate = gate();
    // A fully warm 2000-flaw selection: the first 1000-flaw page already
    // reports the whole selection refreshed, but the run only ends when the
    // last page arrives without a cursor.
    const warmProgress = { complete: true, refreshed_flaws: 2000, selected_flaws: 2000 };
    const firstEntries = botEntries(1, 1000);
    const lastEntries = botEntries(1001, 1000);
    const first = botPage(firstEntries, 'warm-2', warmProgress);
    const last = botPage(lastEntries, null, warmProgress, {
      features: botFeatures, total_flaws_processed: 2000,
    });
    const requests: Request[] = [];
    server.use(
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        const index = requests.push(request) - 1;
        await (index === 0 ? firstGate : lastGate).promise;
        return HttpResponse.json(index === 0 ? first : last);
      }),
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot/cache-status`, () => HttpResponse.json({
        fresh_count: 2000, outdated_count: 0, stale_count: 0, total_flaws_selected: 2000, uncached_count: 0,
      })),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    firstGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(wrapper.text()).toContain('2000 / 2000 flaws refreshed');
    // The saturated refreshed count no longer completes the bar: one
    // delivered page of the two the warm pace projects.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50');
    expect(wrapper.get('[role="progressbar"] .progress-bar').attributes('style')).toContain('width: 50%');
    // The warm 1000-flaw page pace projects two pages, not the 400-flaw request basis.
    expect(wrapper.text()).toContain('· page 1 of ~2');
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('1001 of 1001');
    // The pending last page keeps the run loading: no aggregate placeholders.
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    expect(wrapper.find('tbody').exists()).toBe(false);
    lastGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('2001 of 2001');
    expect(wrapper.get('[data-testid="processed-flaws"]').text()).toContain('2000 processed flaws');
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('flaws refreshed');
    expect(new URL(requests[1].url).searchParams.get('cursor')).toBe('warm-2');
    expect(requests).toHaveLength(2);
  });

  it('closes the selection window at the original request moment for every page of a run', async () => {
    const requestedAt = new Date();
    vi.useFakeTimers({ toFake: ['Date'], now: requestedAt });
    const firstPageGate = gate();
    const botRequests: Request[] = [];
    const feedbackRequests: Request[] = [];
    const entries = [botEntry('CVE-2026-1000'), botEntry('CVE-2026-1000', 'cwe')];
    const first = botPage(entries, 'second', { complete: false, refreshed_flaws: 1, selected_flaws: 2 },
      { features: botFeatures, total_flaws_processed: 1 });
    const second = botPage(entries, null, { complete: true, refreshed_flaws: 2, selected_flaws: 2 },
      { features: botFeatures, total_flaws_processed: 2 });
    const recordedBefore = (request: Request) => new URL(request.url).searchParams.get('recorded_before');
    server.use(
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        botRequests.push(request);
        if (new URL(request.url).searchParams.get('cursor')) return HttpResponse.json(second);
        await firstPageGate.promise;
        return HttpResponse.json(first);
      }),
      http.get(`${baseUrl}/analysis/kpi/cve`, ({ request }) => {
        feedbackRequests.push(request);
        return HttpResponse.json(feedback);
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(botRequests).toHaveLength(1));
    await vi.waitFor(() => expect(feedbackRequests).toHaveLength(1));
    expect(recordedBefore(botRequests[0])).toBe(requestedAt.toISOString());
    expect(recordedBefore(feedbackRequests[0])).toBe(requestedAt.toISOString());
    vi.setSystemTime(new Date(requestedAt.getTime() + 60_000));
    firstPageGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(botRequests).toHaveLength(2);
    expect(recordedBefore(botRequests[1])).toBe(requestedAt.toISOString());
  });

  it.each(['filter', 'invalid range', 'unmount'])('cancels both pending HTTP sources on %s', async (action) => {
    const networkGate = gate();
    const requests: Request[] = [];
    for (const endpoint of ['cve', 'osidb-bot']) {
      server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, async ({ request }) => {
        requests.push(request);
        await networkGate.promise;
        return HttpResponse.json(endpoint === 'cve' ? feedback : botPage([], null));
      }));
    }
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    const original = [...requests];
    if (action === 'filter') await wrapper.get('#kpi-component').setValue('kernel');
    if (action === 'invalid range') {
      await wrapper.get('#kpi-from').setValue('2026-09-03');
      await wrapper.get('#kpi-to').setValue('2026-09-01');
    }
    if (action === 'unmount') {
      wrapper.unmount();
      wrapper = undefined;
    }
    expect(original.every(request => request.signal.aborted)).toBe(true);
    networkGate.resolve();
    await flushPromises();
    if (action === 'filter') {
      await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
      expect(wrapper!.text()).not.toContain('could not be loaded');
    }
    if (action === 'invalid range') {
      expect(wrapper!.text()).toContain('start date must be on or before');
      expect(wrapper!.text()).not.toContain('could not be loaded');
      expect(wrapper!.find('[role="progressbar"]').exists()).toBe(false);
    }
  });

  it.each(['filter', 'invalid range', 'unmount'])('cancels both source retry backoffs on %s', async (action) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const requests: Request[] = [];
    for (const endpoint of ['cve', 'osidb-bot']) {
      server.use(http.get(`${baseUrl}/analysis/kpi/${endpoint}`, ({ request }) => {
        requests.push(request);
        return new URL(request.url).searchParams.get('component') === 'kernel'
          ? HttpResponse.json(endpoint === 'cve' ? feedback : botPage([], null))
          : HttpResponse.text('Unavailable', { status: 503 });
      }));
    }
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await flushPromises();
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(2));
    expect(requests).toHaveLength(2);
    if (action === 'filter') await wrapper.get('#kpi-component').setValue('kernel');
    if (action === 'invalid range') {
      await wrapper.get('#kpi-from').setValue('2026-09-03');
      await wrapper.get('#kpi-to').setValue('2026-09-01');
    }
    if (action === 'unmount') {
      wrapper.unmount();
      wrapper = undefined;
    }
    await flushPromises();
    const requestsAfterCancellation = requests.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(requests).toHaveLength(requestsAfterCancellation);
    expect(vi.getTimerCount()).toBe(0);
    if (action === 'filter') {
      expect(wrapper!.text()).toContain('Combined Acceptance Rate');
      expect(button('Download CSV').attributes('disabled')).toBeUndefined();
    }
    if (action === 'invalid range') expect(wrapper!.text()).toContain('start date must be on or before');
  });

  it('scopes the cache status request to the component filter and renders the stale-cache text', async () => {
    const botGate = gate();
    const requests: Request[] = [];
    server.use(
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async () => {
        await botGate.promise;
        return HttpResponse.json(botPage([botEntry('CVE-2026-1000')], null, null, {
          features: botFeatures, total_flaws_processed: 1,
        }));
      }),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot/cache-status`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          fresh_count: 1, outdated_count: 2, stale_count: 2, total_flaws_selected: 3, uncached_count: 0,
        });
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    const stale = '2 of 3 selected flaws are not cached fresh (0 uncached, 2 changed in OSIDB).';
    await vi.waitFor(() => expect(wrapper!.get('span[role="status"]').text()).toContain(stale));
    // The cache selection total drives the progress denominator until the run reports its own.
    expect(wrapper.text()).toContain('0 / 3 flaws refreshed');
    // No page has arrived yet, so the bar stays indeterminate despite the known total.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(wrapper.get('[role="progressbar"] .progress-bar').classes()).toContain('kpi-progress-indeterminate');
    await wrapper.get('#kpi-component').setValue('kernel');
    await vi.waitFor(() => expect(requests).toHaveLength(2));

    expect(new URL(requests[0].url).search).toBe('');
    const params = new URL(requests[1].url).searchParams;
    expect(params.get('component')).toBe('kernel');
    for (const param of [
      'feature',
      'detail',
      'aegis_version',
      'recorded_after',
      'recorded_before',
      'changed_after',
      'changed_before',
    ]) {
      expect(params.has(param)).toBe(false);
    }
    expect(wrapper.get('span[role="status"]').text()).toContain(`· ${stale}`);
    expect(wrapper.find('.badge').exists()).toBe(false);

    botGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(wrapper.text()).not.toContain('not cached fresh');
    expect(wrapper.find('.badge').exists()).toBe(false);
  });

  it('treats a missing cache-status endpoint as unsupported and keeps the dashboard fully usable', async () => {
    server.use(
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, () =>
        HttpResponse.json(botPage([botEntry('CVE-2026-1000')], null, null, {
          features: botFeatures, total_flaws_processed: 1,
        }))),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot/cache-status`, () =>
        HttpResponse.json({ detail: 'Not Found' }, { status: 404 })),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(wrapper.find('.badge').exists()).toBe(false);
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('could not be loaded');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
  });

  it('reports a cache status failure through its own notice without gating results or export', async () => {
    server.use(
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, () =>
        HttpResponse.json(botPage([botEntry('CVE-2026-1000')], null, null, {
          features: botFeatures, total_flaws_processed: 1,
        }))),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot/cache-status`, () =>
        HttpResponse.json({ detail: 'Cache read failed' }, { status: 500 })),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(wrapper!.text()).toContain('The osidb-bot KPI cache status could not be loaded'));
    const alert = wrapper.get('p[role="alert"]');
    expect(alert.classes()).toEqual(expect.arrayContaining(['alert', 'alert-warning']));
    expect(alert.text()).toContain('HTTP 500');
    expect(alert.text()).toContain('Cache read failed');
    expect(alert.text()).toContain('Select Refresh to try again');
    expect(wrapper.find('div[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Combined Acceptance Rate');
    expect(button('Download CSV').attributes('disabled')).toBeUndefined();
  });

  it.each(['filter change', 'unmount'])('cancels the pending cache status request on %s', async (action) => {
    const networkGate = gate();
    const botGate = gate();
    const requests: Request[] = [];
    server.use(
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async () => {
        await botGate.promise;
        return HttpResponse.json(botPage([botEntry('CVE-2026-1000')], null, null, {
          features: botFeatures, total_flaws_processed: 1,
        }));
      }),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot/cache-status`, async ({ request }) => {
        requests.push(request);
        await networkGate.promise;
        return HttpResponse.json({
          fresh_count: 1, outdated_count: 0, stale_count: 0, total_flaws_selected: 1, uncached_count: 0,
        });
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    if (action === 'filter change') await wrapper.get('#kpi-component').setValue('kernel');
    else {
      wrapper.unmount();
      wrapper = undefined;
    }
    expect(requests[0].signal.aborted).toBe(true);
    networkGate.resolve();
    await flushPromises();
    if (action === 'filter change') {
      await vi.waitFor(() => expect(requests).toHaveLength(2));
      await vi.waitFor(() => expect(wrapper!.get('span[role="status"]').text())
        .toContain('All 1 selected flaws are cached fresh.'));
      expect(wrapper!.text()).toContain('Loading osidb-bot metrics');
      botGate.resolve();
      await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
      expect(wrapper!.text()).not.toContain('cached fresh');
      expect(wrapper!.find('.badge').exists()).toBe(false);
      expect(wrapper!.findAll('[role="alert"]')).toHaveLength(0);
    } else {
      expect(requests).toHaveLength(1);
    }
  });

  it('estimates refreshed pages against the selection while paginating', async () => {
    const secondPageGate = gate();
    const first = botPage([botEntry('CVE-2026-1000')], 'page-2',
      { complete: false, refreshed_flaws: 400, selected_flaws: 600 });
    const second = botPage([botEntry('CVE-2026-1001')], null,
      { complete: true, refreshed_flaws: 600, selected_flaws: 600 });
    server.use(
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('cursor') !== 'page-2') return HttpResponse.json(first);
        await secondPageGate.promise;
        return HttpResponse.json(second);
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(wrapper!.text()).toContain('400 / 600 flaws refreshed'));
    expect(wrapper.text()).toContain('· page 1 of ~2');
    secondPageGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('of ~');
  });
});
