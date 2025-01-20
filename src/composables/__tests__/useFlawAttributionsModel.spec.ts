import { ref } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { useFlaw } from '@/composables/useFlaw';
import { useFlawAttributionsModel } from '@/composables/useFlawAttributionsModel';

import { postFlawAcknowledgment, postFlawReference, putFlawReference } from '@/services/FlawService';
import type { ZodFlawType, ZodFlawReferenceType } from '@/types/zodFlaw';

const { blankFlaw } = useFlaw();

vi.mock('@/services/FlawService');

describe('useFlawAttributionsModel', () => {
  const flaw = ref<ZodFlawType>({
    ...blankFlaw(),
    uuid: 'uuid-123',
    references: [],
    acknowledgments: [],
  });
  const isSaving = ref(false);
  const afterSaveSuccess = vi.fn();
  it('should update a reference successfully', async () => {
    const reference: ZodFlawReferenceType = {
      uuid: 'ref-123',
      description: 'desc',
      type: 'ARTICLE',
      url: 'http://example.com',
      embargoed: false,
      updated_dt: null,
      alerts: [] };
    vi.mocked(putFlawReference).mockResolvedValue();

    const { updateReference } = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);

    await updateReference(reference);
    await flushPromises();

    expect(putFlawReference).toHaveBeenCalledWith('uuid-123', 'ref-123', reference);
    expect(isSaving.value).toBe(false);
  });

  it('should handle error when updating a reference', async () => {
    const reference: ZodFlawReferenceType = {
      uuid: 'ref-123',
      description: 'desc',
      type: 'ARTICLE',
      url: 'http://example.com',
      embargoed: false,
      updated_dt: null,
      alerts: [] };
    vi.mocked(putFlawReference).mockRejectedValue(new Error('Failed to update'));

    const { updateReference } = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);

    await expect(updateReference(reference)).rejects.toThrow('Failed to update');
    await flushPromises();

    expect(putFlawReference).toHaveBeenCalledWith('uuid-123', 'ref-123', reference);
    expect(isSaving.value).toBe(false);
  });

  it('should create a reference successfully', async () => {
    const reference: ZodFlawReferenceType = {
      uuid: '',
      description: 'desc',
      type: 'ARTICLE',
      url: 'http://example.com',
      embargoed: false,
      updated_dt: null,
      alerts: [] };
    vi.mocked(postFlawReference).mockResolvedValue();

    const { createReference } = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);

    await createReference(reference);
    await flushPromises();

    expect(postFlawReference).toHaveBeenCalledWith('uuid-123', reference);
    expect(isSaving.value).toBe(false);
  });

  it('should save references successfully', async () => {
    const references: ZodFlawReferenceType[] = [
      {
        uuid: 'ref-123',
        description: 'desc',
        type: 'ARTICLE',
        url: 'http://example.com',
        embargoed: false,
        updated_dt: null,
        alerts: [] },
      {
        uuid: '',
        description: 'desc',
        type: 'ARTICLE',
        url: 'http://example.com',
        embargoed: false,
        updated_dt: null,
        alerts: [] },
    ];
    vi.mocked(postFlawReference).mockResolvedValue();
    vi.mocked(putFlawReference).mockResolvedValue();

    const { saveReferences } = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);

    await saveReferences(references);
    await flushPromises();

    expect(postFlawReference).toHaveBeenCalledWith('uuid-123', references[1]);
    expect(putFlawReference).toHaveBeenCalledWith('uuid-123', 'ref-123', references[0]);
    expect(isSaving.value).toBe(false);
  });

  it('should save acknowledgments successfully', async () => {
    const acknowledgment = {
      uuid: 'ack-123',
      description: 'desc',
      type: 'ARTICLE',
      url: 'http://example.com',
      embargoed: false,
      updated_dt: null,
      alerts: [] };
    vi.mocked(postFlawAcknowledgment).mockResolvedValue();

    const { createAcknowledgment } = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);

    await createAcknowledgment(acknowledgment);
    await flushPromises();

    expect(postFlawAcknowledgment).toHaveBeenCalledWith('uuid-123', acknowledgment);
    expect(isSaving.value).toBe(false);
  });
});
