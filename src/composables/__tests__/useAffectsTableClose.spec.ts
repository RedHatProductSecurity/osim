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
