import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

import { encodeJWT, mountWithConfig } from '@/__tests__/helpers';
import { deferred, deliveryEntry, deliveryFeatures, deliveryPage } from '@/__tests__/kpiDeliveryFixtures';
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

describe('rendered KPI delivery with real service and HTTP', () => {
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
    // cache keeps its badge out of the assertions below.
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

  it('renders real delivery instead of cache freshness and retains partial snapshots on failure', async () => {
    const metadataGate = gate();
    const firstGate = gate();
    const zeroEntryGate = gate();
    const failureGate = gate();
    const feedbackGate = gate();
    const metadata = deliveryPage('metadata', 0, 10, 'first');
    metadata.progress = { complete: false, refreshed_flaws: 9, selected_flaws: 10 };
    const entries = [deliveryEntry('CVE-2026-1000'), deliveryEntry('CVE-2026-1000', 'cwe')];
    const first = { ...deliveryPage('first', 1, 10, 'zero-entry', entries),
      features: deliveryFeatures,
      total_flaws_processed: 1 };
    const empty = { ...deliveryPage('zero-entry', 2, 10, 'failure'),
      features: { impact: { ...deliveryFeatures.impact, avg_data_quality: 0.55 } },
      total_flaws_processed: 2 };
    const pages = [metadata, first, empty];
    const pageGates = [metadataGate, firstGate, zeroEntryGate, failureGate];
    const requests: Request[] = [];
    server.use(
      http.get(`${baseUrl}/analysis/kpi/osidb-bot`, async ({ request }) => {
        const index = requests.push(request) - 1;
        await pageGates[index].promise;
        return index === 3
          ? HttpResponse.json({ detail: 'Run invalidated' }, { status: 409 })
          : HttpResponse.json(pages[index]);
      }),
      http.get(`${baseUrl}/analysis/kpi/cve`, async () => {
        await feedbackGate.promise;
        return HttpResponse.json(feedback);
      }),
    );
    wrapper = mountWithConfig(KpiMetrics, {}, [pinia]);
    expect(wrapper.text()).toContain('0 flaws received; determining selected total');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined();
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    feedbackGate.resolve();
    await vi.waitFor(() => expect(wrapper!.get('[data-testid="overall-rate"]').text()).toContain('1 of 1'));
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    metadataGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(wrapper.text()).toContain('0 / 10 flaws received');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0');
    expect(wrapper.text()).not.toContain('90%');
    firstGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(wrapper.text()).toContain('1 / 10 flaws received');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('10');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('3 of 3');
    expect(wrapper.get('[data-testid="processed-flaws"]').text()).toContain('1 processed flaws');
    expect(wrapper.get('tbody').text()).toContain('0.60');
    zeroEntryGate.resolve();
    await vi.waitFor(() => expect(requests).toHaveLength(4));
    expect(wrapper.text()).toContain('2 / 10 flaws received');
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('20');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('3 of 3');
    expect(wrapper.get('[data-testid="processed-flaws"]').text()).toContain('2 processed flaws');
    expect(wrapper.get('tbody').text()).toContain('0.55');
    failureGate.resolve();
    await vi.waitFor(() => expect(wrapper!.text()).toContain('Run invalidated'));
    expect(wrapper.text()).toContain('Incomplete osidb-bot metrics: 2 / 10 selected flaws received');
    expect(wrapper.text()).toContain('expired or was invalidated');
    expect(wrapper.text()).toContain('Partial Acceptance Rate');
    expect(wrapper.get('[data-testid="overall-rate"]').text()).toContain('3 of 3');
    expect(wrapper.get('tbody').text()).toContain('0.55');
    expect(button('Download CSV').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(requests).toHaveLength(4);
  });

  it('closes the selection window at the original request moment for every page of a run', async () => {
    const requestedAt = new Date();
    vi.useFakeTimers({ toFake: ['Date'], now: requestedAt });
    const firstPageGate = gate();
    const botRequests: Request[] = [];
    const feedbackRequests: Request[] = [];
    const entries = [deliveryEntry('CVE-2026-1000'), deliveryEntry('CVE-2026-1000', 'cwe')];
    const first = { ...deliveryPage('first', 1, 2, 'second', entries),
      features: deliveryFeatures,
      total_flaws_processed: 1 };
    const second = { ...deliveryPage('second', 2, 2, null, entries),
      features: deliveryFeatures,
      total_flaws_processed: 2 };
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
        return HttpResponse.json(endpoint === 'cve' ? feedback : deliveryPage('empty', 0, 0, null));
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
          ? HttpResponse.json(endpoint === 'cve' ? feedback : deliveryPage('empty', 0, 0, null))
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
});
