import type { Directive } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { http, HttpResponse } from 'msw';

import { useFlaw } from '@/composables/useFlaw';
import { useAffectsModel } from '@/composables/useAffectsModel';

import SampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import { server } from '@/__tests__/setup';
import type { ZodFlawType } from '@/types';
import { useSettingsStore } from '@/stores/SettingsStore';
import { osimRuntime } from '@/stores/osimRuntime';
import * as TrackerService from '@/services/TrackerService';

import AffectsTable from '../AffectsTable.vue';

createTestingPinia();

const statusUrl = 'http://tracker-automanager:8006/tracker_automanager/api/v1/flaws/:flawUuid/trackers';
const statusRecord = (affect = SampleFlawFull.affects[2], status = 'running', failureReason: null | string = null) => ({
  ps_update_stream: affect.ps_update_stream,
  ps_module: affect.ps_module,
  ps_component: affect.ps_component,
  status,
  failure_reason: failureReason,
  external_system_id: null,
});

const mountAffectsTable = async () => {
  const wrapper = mount(AffectsTable, {
    global: {
      directives: {
        osimLoading: vi.fn() as Directive,
      },
      stubs: {
        Teleport: true,
      },
    },
  });

  await flushPromises(); // Needed for the onMounted hook
  return wrapper;
};

describe('tracker creation status', () => {
  beforeEach(() => {
    (osimRuntime as any).value.backends.trackerAutomanager = 'http://tracker-automanager:8006';
    vi.spyOn(globalThis, 'fetch').mockRestore();
    server.use(http.get(statusUrl, () =>
      HttpResponse.json({ flaw_uuid: SampleFlawFull.uuid, trackers: [] }),
    ));
    const { flaw, resetFlaw } = useFlaw();
    resetFlaw();
    flaw.value = structuredClone(SampleFlawFull as unknown as ZodFlawType);
    vi.useFakeTimers();
  });

  afterEach(() => {
    (osimRuntime as any).value.backends.trackerAutomanager = '';
  });

  it.each(['scheduled', 'running', 'retrying', 'created'])('shows %s as In Progress', async (status) => {
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid, trackers: [statusRecord(undefined, status)],
    })));
    const wrapper = await mountAffectsTable();
    const indicator = wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle');
    expect(indicator.text()).toBe('In Progress');
    expect(indicator.find('.spinner-border').exists()).toBe(true);
    expect(wrapper.find('a[href$="/browse/XXXX-0001"]').exists()).toBe(true);
  });

  it('matches the whole persisted identity, retains it through edits and leaves new affects blank', async () => {
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid,
      trackers: [statusRecord(), { ...statusRecord(), ps_module: 'another-module', status: 'failed' }],
    })));
    const wrapper = await mountAffectsTable();
    expect(wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle').exists()).toBe(true);
    const { state: { currentAffects, hasChanges, modifiedAffects } } = useAffectsModel();
    expect(Boolean(hasChanges.value)).toBe(false);
    expect(currentAffects.value[2]).not.toHaveProperty('automanager');
    currentAffects.value[2].ps_component = 'edited-component';
    currentAffects.value = [...currentAffects.value];
    await flushPromises();
    expect(wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle').exists()).toBe(true);
    expect(modifiedAffects.size).toBe(0);
    await wrapper.find('button:has(.bi-plus-lg)').trigger('click');
    await flushPromises();
    expect(wrapper.find('tbody tr.new .bg-warning').exists()).toBe(false);
    expect(wrapper.find('tbody tr.new .placeholder').exists()).toBe(false);
    expect(wrapper.find('tbody tr.new .bg-danger').exists()).toBe(false);
  });

  it('shows failed with a safe reason, and preserves links over failures', async () => {
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid,
      trackers: [
        statusRecord(undefined, 'failed', '<img src=x onerror=alert(1)>'),
        statusRecord(SampleFlawFull.affects[0], 'failed', 'ignored by link'),
      ],
    })));
    const wrapper = await mountAffectsTable();
    const failed = wrapper.findAll('tbody tr')[2].find('.bg-danger-subtle');
    expect(failed.text()).toBe('Failed');
    expect(failed.attributes('title')).toBe('<img src=x onerror=alert(1)>');
    expect(failed.attributes('tabindex')).toBe('0');
    expect(failed.find('.bi-x-circle').exists()).toBe(true);
    expect(failed.find('img').exists()).toBe(false);
    expect(wrapper.find('a[href$="/browse/XXXX-0001"]').exists()).toBe(true);
  });

  it.each([null, '', '   '])('shows failed without a request-error tooltip for reason %s', async (reason) => {
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid, trackers: [statusRecord(undefined, 'failed', reason)],
    })));
    const wrapper = await mountAffectsTable();
    const failed = wrapper.findAll('tbody tr')[2].find('.bg-danger-subtle');
    expect(failed.text()).toBe('Failed');
    expect(failed.attributes('title')).toBeUndefined();
  });

  it('shows request failure on incomplete trackers, but never replaces links', async () => {
    const flaw = useFlaw().flaw.value;
    flaw.affects[2].tracker = { ...flaw.affects[0].tracker!, external_system_id: '' };
    server.use(http.get(statusUrl, () => new HttpResponse('', { status: 503 })));
    const wrapper = await mountAffectsTable();
    expect(wrapper.findAll('tbody tr')[2].find('.bg-danger-subtle').text()).toBe('Failed');
    expect(wrapper.findAll('tbody tr')[2].find('.bg-danger-subtle').attributes('title')).toContain('Unable');
    expect(wrapper.find('a[href$="/browse/XXXX-0001"]').exists()).toBe(true);
    expect(wrapper.findAll('tbody tr')[0].find('.bg-danger-subtle').exists()).toBe(false);
  });

  it('keeps the skeleton until a single flaw-scoped request resolves, across pagination', async () => {
    const settings = useSettingsStore().settings;
    settings.affectsPerPage = 1;
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>(r => resolve = r);
    const fetchOriginal = globalThis.fetch;
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) =>
      String(url).includes('/tracker_automanager/') ? response : fetchOriginal(url, options));
    const wrapper = await mountAffectsTable();
    expect(wrapper.find('tbody .placeholder').exists()).toBe(false); // First row already has a link
    await wrapper.find('.pagination-controls button:last-of-type').trigger('click');
    await wrapper.find('.pagination-controls button:last-of-type').trigger('click');
    expect(wrapper.find('tbody .placeholder').exists()).toBe(true);
    expect(spy.mock.calls.filter(([url]) => String(url).includes('/tracker_automanager/'))).toHaveLength(1);
    resolve(new Response(JSON.stringify({ flaw_uuid: SampleFlawFull.uuid, trackers: [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    await flushPromises();
    expect(wrapper.find('tbody .text-secondary').text()).toBe('none');
    settings.affectsPerPage = SampleFlawFull.affects.length;
  });

  it('recomputes column filters and sorting when the response arrives', async () => {
    let resolve!: (response: Response) => void;
    const response = new Promise<Response>(r => resolve = r);
    const fetchOriginal = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) =>
      String(url).includes('/tracker_automanager/') ? response : fetchOriginal(url, options));
    const wrapper = await mountAffectsTable();
    const table = (wrapper.vm.$ as any).setupState.table;
    table.getColumn('tracker').setFilterValue('In Progress');
    await flushPromises();
    expect(table.getFilteredRowModel().flatRows).toHaveLength(0);
    resolve(new Response(JSON.stringify({
      flaw_uuid: SampleFlawFull.uuid, trackers: [statusRecord()],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await flushPromises();
    expect(table.getFilteredRowModel().flatRows.map((row: any) => row.id)).toContain(SampleFlawFull.affects[2].uuid);
    table.getColumn('tracker').setFilterValue('');
    table.setSorting([{ id: 'tracker', desc: false }]);
    await flushPromises();
    expect(table.getSortedRowModel().flatRows.map((row: any) => row.getValue('tracker'))).toContain('In Progress');
  });

  it('updates global search, filtering and sort using the displayed value', async () => {
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid, trackers: [statusRecord()],
    })));
    const wrapper = await mountAffectsTable();
    await flushPromises();
    const table = (wrapper.vm.$ as any).setupState.table;
    expect(table.getCoreRowModel().rows[2].getValue('tracker')).toBe('In Progress');
    const trackerColumn = table.getColumn('tracker');
    trackerColumn.setFilterValue('In Progress');
    await flushPromises();
    expect(table.getFilteredRowModel().flatRows.map((row: any) => row.id)).toContain(SampleFlawFull.affects[2].uuid);
    trackerColumn.setFilterValue('');
    table.setGlobalFilter('In Progress');
    await flushPromises();
    expect(table.getFilteredRowModel().flatRows.map((row: any) => row.id)).toContain(SampleFlawFull.affects[2].uuid);
    table.setGlobalFilter('');
    table.setSorting([{ id: 'tracker', desc: false }]);
    await flushPromises();
    expect(table.getSortedRowModel().flatRows.map((row: any) => row.getValue('tracker')))
      .toEqual(['In Progress', 'XXXX-0001', 'XXXX-0002']);
  });

  it('ignores late responses after flaw navigation', async () => {
    const fetchOriginal = globalThis.fetch;
    const requests: Array<(response: Response) => void> = [];
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options) =>
      String(url).includes('/tracker_automanager/')
        ? new Promise(resolve => requests.push(resolve))
        : fetchOriginal(url, options));
    const wrapper = await mountAffectsTable();
    expect(requests).toHaveLength(1);
    const otherFlawUuid = crypto.randomUUID();
    useFlaw().flaw.value = {
      ...useFlaw().flaw.value,
      uuid: otherFlawUuid,
      affects: structuredClone(SampleFlawFull.affects) as unknown as ZodFlawType['affects'],
    };
    await flushPromises();
    expect(requests).toHaveLength(2);
    requests[1](new Response(JSON.stringify({ flaw_uuid: otherFlawUuid, trackers: [statusRecord()] }), {
      status: 200,
    }));
    await flushPromises();
    expect(wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle').exists()).toBe(true);
    requests[0](new Response(JSON.stringify({
      flaw_uuid: SampleFlawFull.uuid,
      trackers: [statusRecord(undefined, 'failed')],
    }), { status: 200 }));
    await flushPromises();
    expect(wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle').exists()).toBe(true);
    expect(spy.mock.calls.filter(([url]) => String(url).includes('/tracker_automanager/'))).toHaveLength(2);
  });

  it('replaces the indicator with a link when manual filing returns a tracker', async () => {
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid, trackers: [statusRecord()],
    })));
    const wrapper = await mountAffectsTable();
    const { actions: { refreshData }, state: { currentAffects } } = useAffectsModel();
    currentAffects.value[2].tracker = { ...currentAffects.value[0].tracker!, external_system_id: 'MANUAL-42' };
    refreshData();
    currentAffects.value = [...currentAffects.value];
    await flushPromises();
    expect(wrapper.find('a[href$="/browse/MANUAL-42"]').text()).toContain('MANUAL-42');
    expect(wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle').exists()).toBe(false);
  });

  it('refreshes status after filing a tracker without a link', async () => {
    let requests = 0;
    server.use(http.get(statusUrl, () => HttpResponse.json({
      flaw_uuid: SampleFlawFull.uuid,
      trackers: requests++ ? [statusRecord()] : [],
    })));
    vi.spyOn(TrackerService, 'fileTrackingFor').mockResolvedValue(undefined);
    const wrapper = await mountAffectsTable();
    expect(wrapper.findAll('tbody tr')[2].find('.text-secondary').text()).toBe('none');
    const table = (wrapper.vm.$ as any).setupState.table;
    await table.options.meta.fileTrackers(table.getCoreRowModel().rows[2].original);
    await flushPromises();
    expect(requests).toBe(2);
    expect(wrapper.findAll('tbody tr')[2].find('.bg-warning-subtle').text()).toBe('In Progress');
  });

  it('skips status requests when unconfigured and shows none without altering links', async () => {
    const runtime = osimRuntime as any;
    const previous = runtime.value.backends.trackerAutomanager;
    runtime.value.backends.trackerAutomanager = '';
    try {
      const spy = vi.spyOn(globalThis, 'fetch');
      const wrapper = await mountAffectsTable();
      expect(spy.mock.calls.filter(([url]) => String(url).includes('/tracker_automanager/'))).toHaveLength(0);
      expect(wrapper.findAll('tbody tr')[2].find('.text-secondary').text()).toBe('none');
      expect(wrapper.findAll('tbody tr')[2].find('.placeholder').exists()).toBe(false);
      expect(wrapper.find('a[href$="/browse/XXXX-0001"]').exists()).toBe(true);
    } finally {
      runtime.value.backends.trackerAutomanager = previous;
    }
  });
});
