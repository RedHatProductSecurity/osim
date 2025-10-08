import { reactive } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import type { Row, Table } from '@tanstack/vue-table';

import { useAffectsModel } from '@/composables/useAffectsModel';

import SampleFlawFullV2 from '@/__tests__/__fixtures__/sampleFlawFullV2.json';
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
        osimLoading: vi.fn(),
      },
    },
  });
};

describe('rowActions', () => {
  const affectWithoutTracker = SampleFlawFullV2.affects.find(affect => !affect.tracker) as ZodAffectType;
  const affectWithTracker = SampleFlawFullV2.affects.find(affect => !!affect.tracker) as ZodAffectType;

  beforeEach(() => {
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
