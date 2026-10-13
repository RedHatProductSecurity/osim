import { reactive, type Directive } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import type { Row, Table } from '@tanstack/vue-table';

import { useAffectsModel } from '@/composables/useAffectsModel';

import SampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import { osimRuntime } from '@/stores/osimRuntime';
import type { ZodAffectType } from '@/types';

import RowActions from '../RowActions.vue';

createTestingPinia();

const createMockRow = (affect: ZodAffectType, id: string): Row<ZodAffectType> => ({
  id,
  original: affect,
  toggleSelected: vi.fn(),
} as unknown as Row<ZodAffectType>);

const createMockTable = (unavailableTrackers = new Set<string>(), filingTracker = new Set<string>()) => ({
  options: {
    meta: {
      deleteData: vi.fn(),
      revert: vi.fn(),
      fileTrackers: vi.fn(),
      unavailableTrackers: reactive(unavailableTrackers),
      filingTracker: reactive(filingTracker),
    },
  },
} as unknown as Table<ZodAffectType>);

const mountRowActions = (row: Row<ZodAffectType>, table: Table<ZodAffectType>) => {
  return mount(RowActions, {
    props: { row, table },
    global: {
      directives: {
        osimLoading: vi.fn() as Directive,
      },
    },
  });
};

describe('rowActions', () => {
  const affectWithoutTracker = SampleFlawFull.affects.find(affect => !affect.tracker) as ZodAffectType;
  const affectWithTracker = SampleFlawFull.affects.find(affect => !!affect.tracker) as ZodAffectType;

  beforeEach(() => {
    (osimRuntime.value as any).readOnly = false;
    const { state: { modifiedAffects, newAffects, removedAffects } } = useAffectsModel();
    modifiedAffects.clear();
    newAffects.clear();
    removedAffects.clear();
  });

  it('should render file tracker button for affect without tracker', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    const fileTrackerBtn = wrapper.find('button[title="File tracker"]');
    expect(fileTrackerBtn.exists()).toBe(true);
  });

  it('should render link existing tracker button for an unchanged persisted affect without a tracker', () => {
    const row = createMockRow(affectWithoutTracker, affectWithoutTracker.uuid!);
    const wrapper = mountRowActions(row, createMockTable());

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(true);
  });

  it('should not render link existing tracker button for an affect without a persisted UUID', () => {
    const row = createMockRow({ ...affectWithoutTracker, uuid: null }, 'local-row');
    const wrapper = mountRowActions(row, createMockTable());

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(false);
  });

  it('should not render link existing tracker button for an affect with a tracker', () => {
    const wrapper = mountRowActions(createMockRow(affectWithTracker, affectWithTracker.uuid!), createMockTable());

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(false);
  });

  it('should keep link available when tracker filing is unavailable', () => {
    const table = createMockTable(new Set([affectWithoutTracker.uuid!]));
    const wrapper = mountRowActions(createMockRow(affectWithoutTracker, affectWithoutTracker.uuid!), table);

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(true);
    expect(wrapper.find('button[title="Tracker not available"]').exists()).toBe(true);
  });

  it('should not render link existing tracker in read-only mode', () => {
    (osimRuntime.value as any).readOnly = true;
    const wrapper = mountRowActions(createMockRow(affectWithoutTracker, affectWithoutTracker.uuid!), createMockTable());

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(false);
  });

  it('should disable link and file actions while a row operation is in progress', () => {
    const table = createMockTable(new Set(), new Set([affectWithoutTracker.uuid!]));
    const wrapper = mountRowActions(createMockRow(affectWithoutTracker, affectWithoutTracker.uuid!), table);

    expect(wrapper.find('button[title="Link existing tracker"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button[title="File tracker"]').attributes('disabled')).toBeDefined();
  });

  it('should not render file tracker button for affect with tracker', async () => {
    const row = createMockRow(affectWithTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    const fileTrackerBtn = wrapper.find('button[title="File tracker"]');
    expect(fileTrackerBtn.exists()).toBe(false);
  });

  it('should render tracker unavailable button when affect is marked as unavailable', async () => {
    const unavailableTrackers = new Set([affectWithoutTracker.uuid!]);
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable(unavailableTrackers);
    const wrapper = mountRowActions(row, table);

    const unavailableBtn = wrapper.find('button[title="Tracker not available"]');
    expect(unavailableBtn.exists()).toBe(true);
    expect(unavailableBtn.classes()).toContain('btn-warning');
  });

  it('should not render file tracker button when tracker is unavailable', async () => {
    const unavailableTrackers = new Set([affectWithoutTracker.uuid!]);
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable(unavailableTrackers);
    const wrapper = mountRowActions(row, table);

    const fileTrackerBtn = wrapper.find('button[title="File tracker"]');
    expect(fileTrackerBtn.exists()).toBe(false);
  });

  it('should render revert button for modified rows', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    // Mark the row as modified
    const { state: { modifiedAffects } } = useAffectsModel();
    modifiedAffects.add('row-1');
    await flushPromises();

    const revertBtn = wrapper.find('button[title="Revert changes"]');
    expect(revertBtn.exists()).toBe(true);
  });

  it('should not render link button for modified affects', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const wrapper = mountRowActions(row, createMockTable());
    useAffectsModel().state.modifiedAffects.add('row-1');
    await flushPromises();

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(false);
  });

  it('should not render file tracker button for modified rows', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    // Mark the row as modified
    const { state: { modifiedAffects } } = useAffectsModel();
    modifiedAffects.add('row-1');
    await flushPromises();

    const fileTrackerBtn = wrapper.find('button[title="File tracker"]');
    expect(fileTrackerBtn.exists()).toBe(false);
  });

  it('should not render link button for removed affects', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const wrapper = mountRowActions(row, createMockTable());
    useAffectsModel().state.removedAffects.add('row-1');
    await flushPromises();

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(false);
  });

  it('should not render link button for new affects', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const wrapper = mountRowActions(row, createMockTable());
    useAffectsModel().state.newAffects.add('row-1');
    await flushPromises();

    expect(wrapper.find('button[title="Link existing tracker"]').exists()).toBe(false);
  });

  it('should not render file tracker button for new rows', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    // Mark the row as new
    const { state: { newAffects } } = useAffectsModel();
    newAffects.add('row-1');
    await flushPromises();

    const fileTrackerBtn = wrapper.find('button[title="File tracker"]');
    expect(fileTrackerBtn.exists()).toBe(false);
  });

  it('should call fileTrackers when file tracker button is clicked', async () => {
    const row = createMockRow(affectWithoutTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    const fileTrackerBtn = wrapper.find('button[title="File tracker"]');
    await fileTrackerBtn.trigger('click');

    expect(table.options.meta?.fileTrackers).toHaveBeenCalledWith(affectWithoutTracker);
  });

  it('should call deleteData when remove button is clicked', async () => {
    const row = createMockRow(affectWithTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    const deleteBtn = wrapper.find('button[title="Remove affect"]');
    await deleteBtn.trigger('click');

    expect(table.options.meta?.deleteData).toHaveBeenCalledWith('row-1');
  });

  it('should call revert when revert button is clicked', async () => {
    const row = createMockRow(affectWithTracker, 'row-1');
    const table = createMockTable();
    const wrapper = mountRowActions(row, table);

    // Mark the row as modified
    const { state: { modifiedAffects } } = useAffectsModel();
    modifiedAffects.add('row-1');
    await flushPromises();

    const revertBtn = wrapper.find('button[title="Revert changes"]');
    await revertBtn.trigger('click');

    expect(table.options.meta?.revert).toHaveBeenCalledWith('row-1');
  });
});
