import { ref } from 'vue';

import { createLabel, deleteLabel, fetchLabels, updateLabel } from '@/services/LabelsService';
import { FlawLabelTypeEnum, type ZodFlawLabelType, type ZodFlawType } from '@/types/zodFlaw';
import sampleFlawRequired from '@/__tests__/__fixtures__/sampleFlawRequired.json';
import { StateEnum } from '@/generated-client';

import { useFlawLabels } from '../useFlawLabels';
import { useFlaw } from '../useFlaw';

vi.mock('@/services/LabelsService');
vi.mock('../useFlaw');

describe('useFlawLabels', () => {
  const baseLabel: ZodFlawLabelType = {
    label: 'test-label',
    type: FlawLabelTypeEnum.CONTEXT_BASED,
    state: StateEnum.New,
    relevant: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFlaw, { partial: true }).mockReturnValue({
      flaw: ref({ ...sampleFlawRequired, uuid: 'test-uuid' } as ZodFlawType),
    });
  });

  it('initializes labels correctly', () => {
    const initialLabels = [baseLabel];
    const { areLabelsUpdated, deletedLabels, labels, newLabels, updatedLabels } = useFlawLabels(initialLabels);

    expect(labels.value).toEqual({ [baseLabel.label]: baseLabel });
    expect(newLabels.value).toEqual(new Set());
    expect(updatedLabels.value).toEqual(new Set());
    expect(deletedLabels.value).toEqual(new Set());
    expect(areLabelsUpdated.value).toBe(false);
  });

  it.each<[keyof Pick<ReturnType<typeof useFlawLabels>, 'deletedLabels' | 'newLabels' | 'updatedLabels'>, string]>([
    ['newLabels', 'new-label'],
    ['updatedLabels', 'updated-label'],
    ['deletedLabels', 'deleted-label'],
  ])('computes %s correctly', (key, label) => {
    const { areLabelsUpdated, [key]: labels } = useFlawLabels();

    labels.value.add(label);
    expect(areLabelsUpdated.value).toBe(true);
  });

  it('identifies new, updated, and deleted labels correctly', () => {
    const { deletedLabels, isDeletedLabel, isNewLabel, isUpdatedLabel, newLabels, updatedLabels } = useFlawLabels();

    newLabels.value.add('new-label');
    updatedLabels.value.add('updated-label');
    deletedLabels.value.add('deleted-label');

    expect(isNewLabel({ ...baseLabel, label: 'new-label' })).toBe(true);
    expect(isUpdatedLabel({ ...baseLabel, label: 'updated-label' })).toBe(true);
    expect(isDeletedLabel({ ...baseLabel, label: 'deleted-label' })).toBe(true);
  });

  it('updates labels correctly', async () => {
    const { deletedLabels, newLabels, updatedLabels, updateLabels } = useFlawLabels([
      { ...baseLabel, label: 'new-label' },
      { ...baseLabel, label: 'updated-label' },
      { ...baseLabel, label: 'deleted-label' },
    ]);

    newLabels.value.add('new-label');
    updatedLabels.value.add('updated-label');
    deletedLabels.value.add('deleted-label');

    await updateLabels();

    expect(createLabel).toHaveBeenCalledWith('test-uuid', { ...baseLabel, label: 'new-label' });
    expect(updateLabel).toHaveBeenCalledWith('test-uuid', { ...baseLabel, label: 'updated-label' });
    expect(deleteLabel).toHaveBeenCalledWith('test-uuid', { ...baseLabel, label: 'deleted-label' });
  });

  it('loads context labels correctly', async () => {
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
