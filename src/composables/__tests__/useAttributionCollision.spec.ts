import { ref } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';
import { useFlawAttributionsModel } from '@/composables/useFlawAttributionsModel';
import {
  isAlreadyDeleted,
  isAttributionConflict,
  isMissingAttribution,
} from '@/composables/useAttributionCollision';

import type { ZodFlawAcknowledgmentType, ZodFlawReferenceType, ZodFlawType } from '@/types/zodFlaw';
import {
  deleteFlawAcknowledgment,
  deleteFlawReference,
  getFlaw,
  postFlawReference,
  putFlawReference,
} from '@/services/FlawService';

const mockAddToast = vi.fn();
vi.mock('@/stores/ToastStore', () => ({
  useToastStore: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/services/FlawService');

function reference(overrides: Partial<ZodFlawReferenceType> = {}): ZodFlawReferenceType {
  return {
    description: 'loaded description',
    uuid: 'ref-a',
    type: 'EXTERNAL',
    url: 'https://example.com/a',
    embargoed: false,
    updated_dt: '2024-01-01T00:00:00Z',
    alerts: [],
    ...overrides,
  };
}

function acknowledgment(overrides: Partial<ZodFlawAcknowledgmentType> = {}): ZodFlawAcknowledgmentType {
  return {
    name: 'loaded name',
    affiliation: 'loaded affiliation',
    from_upstream: false,
    flaw: '',
    uuid: 'ack-1',
    embargoed: false,
    created_dt: null,
    updated_dt: '2024-01-01T00:00:00Z',
    alerts: [],
    ...overrides,
  };
}

function serverFlaw(collections: Pick<ZodFlawType, 'references' | 'acknowledgments'>): ZodFlawType {
  return {
    ...blankFlaw(),
    uuid: 'flaw-1',
    references: collections.references,
    acknowledgments: collections.acknowledgments,
  };
}

describe('useAttributionCollision', () => {
  const { flaw, initialFlaw, isFlawUpdated, resetFlaw, setFlaw } = useFlaw();
  const isSaving = ref(false);
  const afterSaveSuccess = vi.fn();

  function loadFlaw(references: ZodFlawReferenceType[], acknowledgments: ZodFlawAcknowledgmentType[] = []) {
    setFlaw(serverFlaw({ references, acknowledgments }));
  }

  function mountModel() {
    return useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);
  }

  /** Loads one reference, edits it, and saves into a 409 with a conflicting server copy. */
  async function stageReferenceConflict() {
    const loaded = reference();
    loadFlaw([loaded]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    const added = reference({ uuid: '', url: 'https://example.com/added', updated_dt: null });
    flaw.value.references = [edited, added];

    const serverCopy = reference({ url: 'https://example.com/a-server', updated_dt: '2024-06-01T00:00:00Z' });
    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 409 } });
    vi.mocked(getFlaw).mockResolvedValueOnce(serverFlaw({ references: [serverCopy], acknowledgments: [] }));

    await expect(model.saveReferences([edited, added])).rejects.toMatchObject({ response: { status: 409 } });
    return { model, edited, added, serverCopy };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetFlaw();
    isSaving.value = false;
  });

  it('does not report the items the user just saved as adopted server updates', async () => {
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];

    vi.mocked(putFlawReference).mockResolvedValue({
      data: { ...edited, updated_dt: '2024-06-02T00:00:00Z' },
    });
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({
      references: [reference({ url: 'https://example.com/a-edited', updated_dt: '2024-06-02T00:00:00Z' })],
      acknowledgments: [],
    }));

    await model.saveReferences([edited]);
    await flushPromises();

    expect(putFlawReference).toHaveBeenCalledWith(
      'flaw-1',
      'ref-a',
      expect.objectContaining({ url: 'https://example.com/a-edited' }),
      { suppressConflictToast: true },
    );
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(isSaving.value).toBe(false);
    expect(afterSaveSuccess).toHaveBeenCalledTimes(1);
    // The server did not change anything the user cannot see: a "took server
    // updates" toast naming the user's own edit would be wrong.
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('retries the interrupted save against the reloaded server state', async () => {
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    const added = reference({ uuid: '', url: 'https://example.com/added', updated_dt: null });
    flaw.value.references = [edited, added];

    vi.mocked(putFlawReference)
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValue({ data: { ...edited, updated_dt: '2024-06-02T00:00:00Z' } });
    vi.mocked(postFlawReference).mockResolvedValue({
      data: { ...added, uuid: 'ref-b', updated_dt: '2024-06-02T00:00:00Z' },
    });
    // The reload shows the server only bumped the concurrency token; the
    // second fetch reflects the state after the retried save.
    vi.mocked(getFlaw)
      .mockResolvedValueOnce(serverFlaw({
        references: [reference({ updated_dt: '2024-06-01T00:00:00Z' })],
        acknowledgments: [],
      }))
      .mockResolvedValueOnce(serverFlaw({
        references: [
          reference({ url: 'https://example.com/a-edited', updated_dt: '2024-06-02T00:00:00Z' }),
          reference({ uuid: 'ref-b', url: 'https://example.com/added', updated_dt: '2024-06-02T00:00:00Z' }),
        ],
        acknowledgments: [],
      }));

    await model.saveReferences([edited, added]);
    await flushPromises();

    expect(putFlawReference).toHaveBeenNthCalledWith(
      1, 'flaw-1', 'ref-a', edited, { suppressConflictToast: true },
    );
    expect(putFlawReference).toHaveBeenNthCalledWith(
      2,
      'flaw-1',
      'ref-a',
      expect.objectContaining({ url: 'https://example.com/a-edited', updated_dt: '2024-06-01T00:00:00Z' }),
      undefined,
    );
    expect(postFlawReference).toHaveBeenCalledWith('flaw-1', expect.objectContaining({ url: 'https://example.com/added' }));
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(isSaving.value).toBe(false);
    expect(afterSaveSuccess).toHaveBeenCalledTimes(1);
  });

  it('stages a both-side conflict for the collision dialog and keeps the list dirty', async () => {
    const { model, edited, added } = await stageReferenceConflict();

    expect(postFlawReference).not.toHaveBeenCalled();
    expect(model.pendingAttributionConflict.value?.references?.conflicts).toEqual([
      expect.objectContaining({ kind: 'reference', uuid: 'ref-a' }),
    ]);
    expect(flaw.value.references).toEqual([edited, added]);
    expect(isSaving.value).toBe(false);
    expect(afterSaveSuccess).not.toHaveBeenCalled();
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('saves the kept local item with the server concurrency token', async () => {
    const { model, edited, serverCopy } = await stageReferenceConflict();

    vi.mocked(putFlawReference).mockClear();
    vi.mocked(putFlawReference).mockResolvedValue({
      data: { ...edited, updated_dt: '2024-06-02T00:00:00Z' },
    });
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({
      references: [reference({ url: 'https://example.com/a-edited', updated_dt: '2024-06-02T00:00:00Z' })],
      acknowledgments: [],
    }));

    await model.applyAttributionResolution({ 'reference:ref-a': 'mine' });
    await flushPromises();

    expect(putFlawReference).toHaveBeenCalledTimes(1);
    expect(putFlawReference).toHaveBeenCalledWith(
      'flaw-1',
      'ref-a',
      expect.objectContaining({ url: 'https://example.com/a-edited', updated_dt: '2024-06-01T00:00:00Z' }),
      undefined,
    );
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(flaw.value.references[0]).toMatchObject({ url: 'https://example.com/a-edited' });
    // The new item the conflict interrupted is still around, unsaved.
    expect(flaw.value.references[1]).toMatchObject({ url: 'https://example.com/added', uuid: '' });
    expect(initialFlaw.value.references).toEqual([serverCopy]);
  });

  it('adopts the server copy of a resolved conflict without re-saving it', async () => {
    const { model, serverCopy } = await stageReferenceConflict();

    vi.mocked(putFlawReference).mockClear();
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [serverCopy], acknowledgments: [] }));

    await model.applyAttributionResolution({ 'reference:ref-a': 'server' });
    await flushPromises();

    expect(putFlawReference).not.toHaveBeenCalled();
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(flaw.value.references[0]).toEqual(serverCopy);
    expect(initialFlaw.value.references).toEqual([serverCopy]);
  });

  it('re-creates a server-removed item the user keeps', async () => {
    const loaded = reference();
    loadFlaw([loaded]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];

    // The server dropped the reference: the update fails with a 404.
    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 404 } });
    vi.mocked(getFlaw).mockResolvedValueOnce(serverFlaw({ references: [], acknowledgments: [] }));
    await expect(model.saveReferences([edited])).rejects.toMatchObject({ response: { status: 404 } });
    expect(model.pendingAttributionConflict.value?.references?.conflicts).toEqual([
      expect.objectContaining({ uuid: 'ref-a', server: 'Removed' }),
    ]);

    vi.mocked(postFlawReference).mockResolvedValue({
      data: { ...edited, uuid: 'ref-new', updated_dt: '2024-06-02T00:00:00Z' },
    });
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({
      references: [reference({ uuid: 'ref-new', url: 'https://example.com/a-edited', updated_dt: '2024-06-02T00:00:00Z' })],
      acknowledgments: [],
    }));

    await model.applyAttributionResolution({ 'reference:ref-a': 'mine' });
    await flushPromises();

    expect(postFlawReference).toHaveBeenCalledWith(
      'flaw-1',
      expect.objectContaining({ url: 'https://example.com/a-edited', uuid: '', updated_dt: null }),
    );
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(flaw.value.references[0]).toMatchObject({ uuid: 'ref-new', url: 'https://example.com/a-edited' });
  });

  it('drops a server-removed item the user gives up', async () => {
    const loaded = reference();
    loadFlaw([loaded]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];

    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 404 } });
    vi.mocked(getFlaw).mockResolvedValueOnce(serverFlaw({ references: [], acknowledgments: [] }));
    await expect(model.saveReferences([edited])).rejects.toMatchObject({ response: { status: 404 } });

    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [], acknowledgments: [] }));

    await model.applyAttributionResolution({ 'reference:ref-a': 'server' });
    await flushPromises();

    expect(putFlawReference).toHaveBeenCalledTimes(1);
    expect(postFlawReference).not.toHaveBeenCalled();
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(flaw.value.references).toEqual([]);
    expect(initialFlaw.value.references).toEqual([]);
  });

  it('folds server additions, updates, and removals into the model and baselines them', () => {
    loadFlaw(
      [reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b' })],
      [acknowledgment()],
    );
    const model = mountModel();

    const serverReference = reference({ url: 'https://example.com/a-server', updated_dt: '2024-06-01T00:00:00Z' });
    const addedReference = reference({ uuid: 'ref-c', url: 'https://example.com/c' });
    const serverAcknowledgment = acknowledgment({ name: 'server name', updated_dt: '2024-06-01T00:00:00Z' });

    model.mergeServerAttributions({
      references: [serverReference, addedReference],
      acknowledgments: [serverAcknowledgment],
    });

    expect(flaw.value.references).toEqual([serverReference, addedReference]);
    expect(flaw.value.acknowledgments).toEqual([serverAcknowledgment]);
    expect(initialFlaw.value.references).toEqual([serverReference, addedReference]);
    expect(isFlawUpdated.value).toBe(false);
    expect(mockAddToast).toHaveBeenCalledWith({
      title: 'Flaw saved with newer changes',
      body: 'Kept your edits and took server updates for '
        + 'https://example.com/a-server, https://example.com/c, server name.',
      css: 'info',
    });
  });

  it('drops items the server removed while the form left them alone', () => {
    loadFlaw([reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b' })]);
    const model = mountModel();
    const kept = reference({ uuid: 'ref-b', url: 'https://example.com/b' });

    model.mergeServerAttributions({ references: [kept], acknowledgments: [] });

    expect(flaw.value.references).toEqual([kept]);
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('https://example.com/a'),
    }));
  });

  it('stages a both-side conflict from a merge without touching the local list', () => {
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];
    const serverCopy = reference({ url: 'https://example.com/a-server', updated_dt: '2024-06-01T00:00:00Z' });

    model.mergeServerAttributions({ references: [serverCopy], acknowledgments: [] });

    expect(model.pendingAttributionConflict.value?.references?.conflicts).toHaveLength(1);
    expect(flaw.value.references).toEqual([edited]);
    expect(initialFlaw.value.references).toEqual([serverCopy]);
    expect(isFlawUpdated.value).toBe(true);
  });

  it('treats a 404 delete as already gone and clears the item', async () => {
    loadFlaw([reference()]);
    const model = mountModel();
    vi.mocked(deleteFlawReference).mockRejectedValueOnce({ response: { status: 404, data: 'Not found.' } });

    await model.deleteReference('ref-a');

    expect(flaw.value.references).toEqual([]);
    expect(afterSaveSuccess).toHaveBeenCalledTimes(1);
    expect(mockAddToast).not.toHaveBeenCalled();
    expect(isSaving.value).toBe(false);
  });

  it('treats a "does not exist" delete error as already gone', async () => {
    loadFlaw([], [acknowledgment()]);
    const model = mountModel();
    vi.mocked(deleteFlawAcknowledgment).mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Acknowledgment does not exist.' } },
    });

    await model.deleteAcknowledgment('ack-1');

    expect(flaw.value.acknowledgments).toEqual([]);
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('toasts and rethrows other delete errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loadFlaw([reference()]);
    const model = mountModel();
    vi.mocked(deleteFlawReference).mockRejectedValueOnce({ response: { status: 500, data: 'boom' } });

    await expect(model.deleteReference('ref-a')).rejects.toMatchObject({ response: { status: 500 } });

    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error deleting Reference:' }));
    expect(flaw.value.references).toHaveLength(1);
    expect(isSaving.value).toBe(false);
  });

  it('toasts and rethrows when the conflict reload fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];

    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 409 } });
    vi.mocked(getFlaw).mockRejectedValueOnce(new Error('reload failed'));

    await expect(model.saveReferences([edited])).rejects.toMatchObject({ response: { status: 409 } });

    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mid-air collision detected' }));
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(afterSaveSuccess).not.toHaveBeenCalled();
  });
});

describe('attribution conflict classifiers', () => {
  it('detects missing attributions by status', () => {
    expect(isMissingAttribution({ response: { status: 404 } })).toBe(true);
    expect(isMissingAttribution({ response: { status: 409 } })).toBe(false);
    expect(isMissingAttribution({ response: { status: 500 } })).toBe(false);
    expect(isMissingAttribution(new Error('network'))).toBe(false);
  });

  it('treats stale-token 409s and missing-item 404s as reconcilable conflicts', () => {
    expect(isAttributionConflict({ response: { status: 409 } })).toBe(true);
    expect(isAttributionConflict({ response: { status: 404 } })).toBe(true);
    expect(isAttributionConflict({ response: { status: 500 } })).toBe(false);
    expect(isAttributionConflict(new Error('network'))).toBe(false);
  });

  it('detects already-deleted error bodies', () => {
    expect(isAlreadyDeleted({ response: { status: 400, data: 'Reference does not exist.' } })).toBe(true);
    expect(isAlreadyDeleted({ response: { status: 400, data: { detail: 'does not exist' } } })).toBe(true);
    expect(isAlreadyDeleted({ response: { status: 500, data: 'boom' } })).toBe(false);
    expect(isAlreadyDeleted({ response: { data: undefined } })).toBe(false);
    expect(isAlreadyDeleted(null)).toBe(false);
  });
});
