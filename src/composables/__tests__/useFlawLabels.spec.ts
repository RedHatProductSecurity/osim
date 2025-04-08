import * as sampleFlawRequired from '@test-fixtures/sampleFlawRequired.json';

import { createLabel, deleteLabel, fetchLabels, updateLabel } from '@/services/LabelsService';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';
import { StateEnum } from '@/generated-client';

import { useMockFlawWithModules } from './helpers';

vi.mock('@/services/LabelsService');

const useMocks = async () => await useMockFlawWithModules(sampleFlawRequired, vi)({
  useFlaw: '@/composables/useFlaw',
  useFlawLabels: '@/composables/useFlawLabels',
});
type MockTypes = Awaited<ReturnType<typeof useMocks>>;
type UseFlawLabels = MockTypes['useFlawLabels'];

describe('useFlawLabels', () => {
  const baseLabel: ZodFlawLabelType = {
    label: 'test-label',
    type: FlawLabelTypeEnum.CONTEXT_BASED,
    state: StateEnum.New,
    relevant: true,
  };

  it('initializes labels correctly', async () => {
    const initialLabels = [baseLabel];
    const { useFlawLabels } = await useMocks();
    const { areLabelsUpdated, deletedLabels, labels, newLabels, updatedLabels } = useFlawLabels(initialLabels);

    expect(labels.value).toEqual({ [baseLabel.label]: baseLabel });
    expect(newLabels.value).toEqual(new Set());
    expect(updatedLabels.value).toEqual(new Set());
    expect(deletedLabels.value).toEqual(new Set());
    expect(areLabelsUpdated.value).toBe(false);
  });

  it.each<[keyof Pick<ReturnType<UseFlawLabels>, 'deletedLabels' | 'newLabels' | 'updatedLabels'>, string]>([
    ['newLabels', 'new-label'],
    ['updatedLabels', 'updated-label'],
    ['deletedLabels', 'deleted-label'],
  ])('computes %s correctly', async (key, label) => {
    const { useFlawLabels } = await useMocks();
    const { areLabelsUpdated, [key]: labels } = useFlawLabels();

    labels.value.add(label);
    expect(areLabelsUpdated.value).toBe(true);
  });

  it('identifies new, updated, and deleted labels correctly', async () => {
    const { useFlawLabels } = await useMocks();
    const { deletedLabels, isDeletedLabel, isNewLabel, isUpdatedLabel, newLabels, updatedLabels } = useFlawLabels();

    newLabels.value.add('new-label');
    updatedLabels.value.add('updated-label');
    deletedLabels.value.add('deleted-label');

    expect(isNewLabel({ ...baseLabel, label: 'new-label' })).toBe(true);
    expect(isUpdatedLabel({ ...baseLabel, label: 'updated-label' })).toBe(true);
    expect(isDeletedLabel({ ...baseLabel, label: 'deleted-label' })).toBe(true);
  });

  it('updates labels correctly', async () => {
    const { useFlawLabels } = await useMocks();
    const { deletedLabels, newLabels, updatedLabels, updateLabels } = useFlawLabels([
      { ...baseLabel, label: 'new-label' },
      { ...baseLabel, label: 'updated-label' },
      { ...baseLabel, label: 'deleted-label' },
    ]);

    newLabels.value.add('new-label');
    updatedLabels.value.add('updated-label');
    deletedLabels.value.add('deleted-label');
    const testUuid = sampleFlawRequired.uuid;
    await updateLabels();

    expect(createLabel).toHaveBeenCalledWith(testUuid, { ...baseLabel, label: 'new-label' });
    expect(updateLabel).toHaveBeenCalledWith(testUuid, { ...baseLabel, label: 'updated-label' });
    expect(deleteLabel).toHaveBeenCalledWith(testUuid, { ...baseLabel, label: 'deleted-label' });
  });

  it('loads context labels correctly', async () => {
    const { useFlawLabels } = await useMocks();
    const { loadContextLabels } = useFlawLabels();
    const mockLabels = [
      { ...baseLabel, name: 'context-label' },
      { ...baseLabel, name: 'other-label', type: FlawLabelTypeEnum.PRODUCT_FAMILY },
    ];

    vi.mocked(fetchLabels).mockResolvedValue(mockLabels);

    const labels = await loadContextLabels();

    expect(labels).toEqual(['context-label']);
  });
});
