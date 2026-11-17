import { nextTick } from 'vue';

import { createTestingPinia } from '@pinia/testing';

import { useAffectsTable } from '@/composables/useAffectsTable';
import { useFlaw } from '@/composables/useFlaw';
import { useAffectsModel } from '@/composables/useAffectsModel';

import * as JiraService from '@/services/JiraService';
import SampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import type { ZodFlawType } from '@/types';

createTestingPinia();

it('clears closing state even when the post-close refresh callback throws', async () => {
  const { flaw } = useFlaw();
  flaw.value = structuredClone(SampleFlawFull as unknown as ZodFlawType);
  useAffectsModel().actions.initializeAffects(flaw.value.affects);
  vi.spyOn(JiraService, 'getJiraTransitions').mockResolvedValue({
    data: { transitions: [{ id: '61',
      name: 'Finish',
      to: { name: 'Closed' },
      fields: {
        resolution: { name: 'Resolution',
          required: true,
          operations: ['set'],
          allowedValues: [{ id: '2', name: 'Won\'t Do' }] },
      } }] },
    response: {} as Response,
  });
  vi.spyOn(JiraService, 'closeJiraIssue').mockResolvedValue({ data: undefined, response: {} as Response });
  const refresh = vi.fn(() => { throw new Error('refresh failed'); });
  const { actions, state } = useAffectsTable(refresh);
  const row = state.table.getCoreRowModel().flatRows
    .find(row => row.original.tracker?.external_system_id === 'XXXX-0001')!;
  row.toggleSelected(true);

  await actions.closeSelectedTrackers();
  state.closeChoice.value.resolution = '2';
  await expect(actions.submitCloseTrackers()).rejects.toThrow('refresh failed');
  expect(JiraService.closeJiraIssue).toHaveBeenCalledTimes(1);
  expect(state.isClosingTrackers.value).toBe(false);
  expect(state.showCloseDialog.value).toBe(false);

  vi.restoreAllMocks();
});

it('keeps a promoted row selected under its server id', async () => {
  const localId = 'local-row';
  const serverId = 'server-uuid';
  const { flaw } = useFlaw();
  const source = structuredClone(SampleFlawFull as unknown as ZodFlawType);
  const draft = { ...source.affects[0], _uuid: localId, uuid: null };
  flaw.value = { ...source, affects: [] };
  const model = useAffectsModel();
  model.actions.initializeAffects([]);
  model.state.currentAffects.value = [draft];
  model.actions.markNew(localId);
  model.actions.refreshData();

  const { state } = useAffectsTable(() => {});
  state.table.getRow(localId).toggleSelected(true);
  state.expandedRows.value = { [localId]: true };
  model.state.affectIdAliases.value = { [localId]: serverId };
  await nextTick();

  expect(state.table.getState().rowSelection[serverId]).toBe(true);
  expect(state.table.getState().rowSelection[localId]).toBeUndefined();
  expect(state.expandedRows.value[serverId]).toBe(true);
  expect(state.expandedRows.value[localId]).toBeUndefined();
});
