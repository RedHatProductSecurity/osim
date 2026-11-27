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
    const first = botPage(entries, 'second', { complete: false, delivered_flaws: 2, selected_flaws: 1000 });
    const second = botPage([botEntry('CVE-2026-1001')], 'third',
      { complete: false, delivered_flaws: 9, selected_flaws: 1000 });
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
    expect(wrapper.text()).toContain('0 flaws received; awaiting the first page');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    feedbackGate.resolve();
    await vi.waitFor(() => expect(wrapper!.get('[data-testid="overall-rate"]').text()).toContain('1 of 1'));
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    firstGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(wrapper.text()).toContain('2 / 1000 flaws received');
    // The bar tracks the exact delivery ratio: 2 of 1000 flaws so far.
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('3 of 3');
    // Intermediate snapshots hide placeholder aggregates.
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    expect(wrapper.find('tbody').exists()).toBe(false);
    secondGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(wrapper.text()).toContain('9 / 1000 flaws received');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('1');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('4 of 4');
    expect(wrapper.find('[data-testid="processed-flaws"]').exists()).toBe(false);
    failureGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Run invalidated'));
    const warning = wrapper.get('p[role="status"]');
    expect(warning.text()).toContain('Incomplete osidb-bot metrics: 9 / 1000 selected flaws received');
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
    const warmProgress = { complete: true, delivered_flaws: 2000, refreshed_flaws: 2000, selected_flaws: 2000 };
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
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    firstGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(wrapper.text()).toContain('2000 / 2000 flaws received');
    // The completed delivery ratio hides the bar even though the pending
    // last page keeps the run loading.
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
    expect(wrapper.text()).not.toContain('flaws received');
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
    const first = botPage(entries, 'second', { complete: false, delivered_flaws: 1, selected_flaws: 2 },
      { features: botFeatures, total_flaws_processed: 1 });
    const second = botPage(entries, null, { complete: true, delivered_flaws: 2, selected_flaws: 2 },
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

  it('renders delivery and refresh progress from each page while paginating', async () => {
    const secondPageGate = gate();
    // A 600-flaw selection with 350 stale flaws: the first page refreshes its
    // own 400-flaw slice (250 of the stale flaws sit in it), so 100 stale
    // flaws remain for the final page's slice to refresh.
    const first = botPage([botEntry('CVE-2026-1000')], 'page-2',
      { complete: false, delivered_flaws: 400, refreshed_flaws: 500, selected_flaws: 600 });
    const second = botPage([botEntry('CVE-2026-1001')], null,
      { complete: true, delivered_flaws: 600, refreshed_flaws: 600, selected_flaws: 600 });
    server.use(
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('cursor') !== 'page-2') return HttpResponse.json(first);
        await secondPageGate.promise;
        return HttpResponse.json(second);
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    await vi.waitFor(() => expect(wrapper!.text()).toContain('400 / 600 flaws received'));
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('67');
    await vi.waitFor(() => expect(wrapper!.text()).toContain('500 / 600 flaws refreshed'));
    secondPageGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Refreshing osidb-bot cache');
    expect(wrapper.text()).not.toContain('of ~');
  });

  it('requests the first page immediately without any cache-refresh POST', async () => {
    const pageGate = gate();
    const refreshRequests: Request[] = [];
    const pageRequests: Request[] = [];
    // A one-flaw selection fits a single final page with no continuation.
    const only = botPage([botEntry('CVE-2026-1000')], null,
      { complete: true, delivered_flaws: 1, refreshed_flaws: 1, selected_flaws: 1 },
      { features: botFeatures, total_flaws_processed: 1 });
    server.use(
      // Any drain attempt would land here; pagination alone must load the run.
      http.post(`${baseUrl}/analysis/kpi/osidb-bot/cache-refresh`, ({ request }) => {
        refreshRequests.push(request);
        return HttpResponse.json({ detail: 'Not Found' }, { status: 404 });
      }),
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        pageRequests.push(request);
        await pageGate.promise;
        return HttpResponse.json(only);
      }),
      http.get(`${baseUrl}/analysis/kpi/cve`, () => HttpResponse.json(feedback)),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);

    // The page GET is issued straight away: no drain happens first.
    await vi.waitFor(() => expect(pageRequests).toHaveLength(1));
    expect(pageRequests[0].method).toBe('GET');
    expect(pageRequests[0].headers.get('Authorization')).toMatch(/^Bearer /);
    expect(pageRequests[0].credentials).toBe('include');
    expect(pageRequests[0].cache).toBe('no-store');

    pageGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Combined Acceptance Rate'));
    expect(refreshRequests).toHaveLength(0);
    expect(pageRequests).toHaveLength(1);
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Refreshing osidb-bot cache');
  });
});
