import { createTestingPinia } from '@pinia/testing';
import type { Table } from '@tanstack/vue-table';

import { useAffectsTable } from '@/composables/useAffectsTable';
import { useFlaw } from '@/composables/useFlaw';
import { useAffectsModel } from '@/composables/useAffectsModel';

import SampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import type { ZodAffectType, ZodFlawType } from '@/types';
import { useSettingsStore } from '@/stores/SettingsStore';

createTestingPinia();

/** Column order as persisted by a user who saved the affects-table settings
 * before the Provenance column existed (OSIDB-5421): no `provenance` id and
 * the trailing sticky `actions` column last. */
const PRE_PROVENANCE_ORDER = [
  'Select',
  'cve',
  'labels',
  'ps_update_stream',
  'ps_module',
  'ps_component',
  'purl',
  'subpackage_purls',
  'affectedness',
  'not_affected_justification',
  'resolution',
  'impact',
  'cvss_scores',
  'tracker',
  'Tracker Status',
  'created_dt',
  'updated_dt',
  'Tracker Creation date',
  'Tracker Update date',
  'actions',
];

function setupTable(persistedOrder: string[]) {
  const { flaw } = useFlaw();
  flaw.value = structuredClone(SampleFlawFull as unknown as ZodFlawType);
  useAffectsModel().actions.initializeAffects(flaw.value.affects);
  useSettingsStore().settings.affectsColumnOrder = persistedOrder;
  return useAffectsTable().state.table;
}

const leafColumnIds = (table: Table<ZodAffectType>) =>
  table.getAllLeafColumns().map(column => column.id);

const headerIds = (table: Table<ZodAffectType>) =>
  table.getHeaderGroups()[0].headers.map(header => header.column.id);

describe('useAffectsTable column order reconciliation', () => {
  afterEach(() => {
    useSettingsStore().settings.affectsColumnOrder = [];
  });

  it('inserts a column missing from the persisted order just before the actions column', () => {
    const table = setupTable(PRE_PROVENANCE_ORDER);

    const expected = [...PRE_PROVENANCE_ORDER.slice(0, -1), 'provenance', 'actions'];
    expect(table.getState().columnOrder).toEqual(expected);
    expect(headerIds(table)).toEqual(expected);
    expect(leafColumnIds(table)).toEqual(expected);
  });

  it('drops persisted ids that no longer exist in the column definitions', () => {
    const table = setupTable(['ghost_column', 'ps_module', 'actions', 'stale_id']);

    const order = table.getState().columnOrder;
    expect(order).not.toContain('ghost_column');
    expect(order).not.toContain('stale_id');
    expect(order[0]).toBe('ps_module');
    expect(order[order.length - 1]).toBe('actions');

    // every current column is still rendered exactly once
    const currentIds = leafColumnIds(table);
    expect(order).toHaveLength(currentIds.length);
    expect([...new Set(order)]).toHaveLength(order.length);
    expect([...order].sort()).toEqual([...currentIds].sort());
  });

  it('uses the pure default order when the persisted order is empty', () => {
    const table = setupTable([]);

    expect(table.getState().columnOrder).toEqual([]);

    const order = leafColumnIds(table);
    expect(order[0]).toBe('Select');
    expect(order[order.length - 1]).toBe('actions');
    // the default order follows the column definitions
    expect(order.indexOf('labels')).toBeLessThan(order.indexOf('provenance'));
    expect(order.indexOf('provenance')).toBeLessThan(order.indexOf('ps_update_stream'));
  });

  it('respects a persisted order that already contains every column', () => {
    const defaultOrder = leafColumnIds(setupTable([]));
    const customOrder = ['provenance', ...defaultOrder.filter(id => id !== 'provenance')];

    const table = setupTable(customOrder);

    expect(table.getState().columnOrder).toEqual(customOrder);
    expect(leafColumnIds(table)).toEqual(customOrder);
    expect(headerIds(table)).toEqual(customOrder);
  });

  it('appends missing columns after the persisted ones when the order lacks an actions column', () => {
    const table = setupTable(['ps_module', 'labels']);

    const order = table.getState().columnOrder;
    expect(order.slice(0, 2)).toEqual(['ps_module', 'labels']);
    expect(order.indexOf('provenance')).toBeGreaterThan(1);
    expect(order.indexOf('provenance')).toBeLessThan(order.indexOf('actions'));
    expect(order[order.length - 1]).toBe('actions');
  });
});
