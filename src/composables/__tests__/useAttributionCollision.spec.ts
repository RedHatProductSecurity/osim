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

function serverFlaw(collections: Pick<ZodFlawType, 'acknowledgments' | 'references'>): ZodFlawType {
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
    } as any);
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

  it('no longer counts saved references as dirty after a save with no server-side changes', async () => {
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];
    expect(isFlawUpdated.value).toBe(true);

    vi.mocked(putFlawReference).mockResolvedValue({
      data: { ...edited, updated_dt: '2024-06-02T00:00:00Z' },
    } as any);
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({
      references: [reference({ url: 'https://example.com/a-edited', updated_dt: '2024-06-02T00:00:00Z' })],
      acknowledgments: [],
    }));

    await model.saveReferences([edited]);
    await flushPromises();

    // The just-saved values converged with the server, so the baseline
    // advanced and the save no longer counts as dirty work.
    expect(isFlawUpdated.value).toBe(false);
    expect(model.pendingAttributionConflict.value).toBeNull();
  });

  it('keeps uuid-less new references dirty after a save', async () => {
    loadFlaw([]);
    const model = mountModel();
    const added = reference({ uuid: '', url: 'https://example.com/added', updated_dt: null });
    flaw.value.references = [added];

    // The create did not hand back a server identity, so the item stays
    // genuinely unsaved local work.
    vi.mocked(postFlawReference).mockResolvedValue(undefined as never);
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [], acknowledgments: [] }));

    await model.saveReferences([added]);
    await flushPromises();

    expect(isFlawUpdated.value).toBe(true);
  });

  it('retries the interrupted save against the reloaded server state', async () => {
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    const added = reference({ uuid: '', url: 'https://example.com/added', updated_dt: null });
    flaw.value.references = [edited, added];

    vi.mocked(putFlawReference)
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValue({ data: { ...edited, updated_dt: '2024-06-02T00:00:00Z' } } as any);
    vi.mocked(postFlawReference).mockResolvedValue({
      data: { ...added, uuid: 'ref-b', updated_dt: '2024-06-02T00:00:00Z' },
    } as any);
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
    const { added, edited, model } = await stageReferenceConflict();

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
    const { edited, model, serverCopy } = await stageReferenceConflict();

    vi.mocked(putFlawReference).mockClear();
    vi.mocked(putFlawReference).mockResolvedValue({
      data: { ...edited, updated_dt: '2024-06-02T00:00:00Z' },
    } as any);
    const resaved = reference({ url: 'https://example.com/a-edited', updated_dt: '2024-06-02T00:00:00Z' });
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [resaved], acknowledgments: [] }));

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
    // The post-resolution baseline equals the final re-fetched server state,
    // not the conflict-time copy the resolution was picked against.
    expect(initialFlaw.value.references).toEqual([resaved]);
    expect(serverCopy.updated_dt).toBe('2024-06-01T00:00:00Z');
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
    } as any);
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

  it('stages a delete-versus-edit conflict with the local side shown as Removed', () => {
    const loadedSecond = reference({ uuid: 'ref-b', url: 'https://example.com/b' });
    loadFlaw([reference(), loadedSecond]);
    const model = mountModel();
    // The form deleted ref-b locally while the server edited it.
    flaw.value.references = [reference()];
    const serverEdited = reference({
      uuid: 'ref-b',
      url: 'https://example.com/b-server',
      updated_dt: '2024-06-01T00:00:00Z',
    });

    model.mergeServerAttributions({ references: [reference(), serverEdited], acknowledgments: [] });

    expect(model.pendingAttributionConflict.value?.references?.conflicts).toEqual([{
      itemLabel: 'https://example.com/b',
      kind: 'reference',
      mine: 'Removed',
      server: 'Link URL: https://example.com/b-server',
      uuid: 'ref-b',
    }]);
    expect(model.pendingAttributionConflict.value?.references?.conflictedRows).toEqual([
      { kind: 'reference', mine: null, server: serverEdited, uuid: 'ref-b' },
    ]);
    // The staged kind leaves both the local list and the baseline alone.
    expect(flaw.value.references).toEqual([reference()]);
    expect(initialFlaw.value.references).toEqual([reference(), loadedSecond]);
  });

  it('keeps a local deletion silent when the server copy is unchanged', () => {
    loadFlaw([reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b' })]);
    const model = mountModel();
    flaw.value.references = [reference()];

    // Only the concurrency token moved: the editable fields are unchanged.
    model.mergeServerAttributions({
      references: [reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b', updated_dt: '2024-06-01T00:00:00Z' })],
      acknowledgments: [],
    });

    expect(model.pendingAttributionConflict.value).toBeNull();
    // The deletion stays authoritative: the merge must not resurrect the item.
    expect(flaw.value.references).toEqual([reference()]);
    expect(mockAddToast).not.toHaveBeenCalled();
    // The deletion is still unsaved work, not something the merge swallowed.
    expect(isFlawUpdated.value).toBe(true);
  });

  it('resurrects the server-edited item when the user keeps the server side', async () => {
    loadFlaw([reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b' })]);
    const model = mountModel();
    flaw.value.references = [reference()];
    const serverEdited = reference({
      uuid: 'ref-b',
      url: 'https://example.com/b-server',
      updated_dt: '2024-06-01T00:00:00Z',
    });
    model.mergeServerAttributions({ references: [reference(), serverEdited], acknowledgments: [] });

    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [reference(), serverEdited], acknowledgments: [] }));

    await model.applyAttributionResolution({ 'reference:ref-b': 'server' });
    await flushPromises();

    expect(deleteFlawReference).not.toHaveBeenCalled();
    expect(putFlawReference).not.toHaveBeenCalled();
    expect(flaw.value.references).toEqual([reference(), serverEdited]);
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(isFlawUpdated.value).toBe(false);
  });

  it('deletes the server-edited item the user keeps removed', async () => {
    loadFlaw([reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b' })]);
    const model = mountModel();
    flaw.value.references = [reference()];
    const serverEdited = reference({
      uuid: 'ref-b',
      url: 'https://example.com/b-server',
      updated_dt: '2024-06-01T00:00:00Z',
    });
    model.mergeServerAttributions({ references: [reference(), serverEdited], acknowledgments: [] });

    vi.mocked(deleteFlawReference).mockResolvedValue({} as any);
    // The fresh fetch reflects the completed deletion.
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [reference()], acknowledgments: [] }));

    await model.applyAttributionResolution({ 'reference:ref-b': 'mine' });
    await flushPromises();

    expect(deleteFlawReference).toHaveBeenCalledWith('flaw-1', 'ref-b', { suppressErrorToast: true });
    expect(flaw.value.references).toEqual([reference()]);
    expect(initialFlaw.value.references).toEqual([reference()]);
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(isFlawUpdated.value).toBe(false);
  });

  it('re-stages a failed resolution against the fresh server values', async () => {
    const { model } = await stageReferenceConflict();

    // The confirm write hits its own stale token...
    vi.mocked(putFlawReference).mockClear();
    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 409 } });
    // ...and the reload shows the server moved again while the write was failing.
    const fresherCopy = reference({ url: 'https://example.com/a-server', updated_dt: '2024-06-03T00:00:00Z' });
    vi.mocked(getFlaw).mockResolvedValueOnce(serverFlaw({ references: [fresherCopy], acknowledgments: [] }));

    await expect(model.applyAttributionResolution({ 'reference:ref-a': 'mine' }))
      .rejects.toMatchObject({ response: { status: 409 } });

    // The dialog stays open, re-staged against the fresh server copy instead
    // of the stale one the failed write carried.
    expect(model.pendingAttributionConflict.value?.references?.conflictedRows[0]?.server)
      .toMatchObject({ updated_dt: '2024-06-03T00:00:00Z' });

    vi.mocked(putFlawReference).mockResolvedValue({ data: {} } as any);
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [fresherCopy], acknowledgments: [] }));

    await model.applyAttributionResolution({ 'reference:ref-a': 'mine' });
    await flushPromises();

    // The retry confirms against the fresh token instead of replaying the
    // stale one and failing again.
    expect(putFlawReference).toHaveBeenCalledWith(
      'flaw-1',
      'ref-a',
      expect.objectContaining({ url: 'https://example.com/a-edited', updated_dt: '2024-06-03T00:00:00Z' }),
      undefined,
    );
    expect(model.pendingAttributionConflict.value).toBeNull();
  });

  it('does not duplicate adopted server additions when a confirmation is retried', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loadFlaw([reference()]);
    const model = mountModel();
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];
    const serverCopy = reference({ url: 'https://example.com/a-server', updated_dt: '2024-06-01T00:00:00Z' });
    const added = reference({ uuid: 'ref-c', url: 'https://example.com/c', updated_dt: '2024-06-01T00:00:00Z' });
    // The server edited ref-a (a conflict) and added ref-c (an adoption).
    model.mergeServerAttributions({ references: [serverCopy, added], acknowledgments: [] });
    expect(model.pendingAttributionConflict.value).not.toBeNull();

    // The confirm keeps ref-a and fails its write; the re-stage reload fails
    // too, so the same pending result must survive the retry.
    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 409 } });
    vi.mocked(getFlaw).mockRejectedValueOnce(new Error('reload failed'));
    await expect(model.applyAttributionResolution({ 'reference:ref-a': 'mine' }))
      .rejects.toMatchObject({ response: { status: 409 } });
    // The first confirmation already folded the server addition into the list.
    expect(flaw.value.references).toEqual([
      expect.objectContaining({ uuid: 'ref-a', url: 'https://example.com/a-edited' }),
      expect.objectContaining({ uuid: 'ref-c' }),
    ]);

    vi.mocked(putFlawReference).mockResolvedValue({ data: {} } as any);
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw({ references: [serverCopy, added], acknowledgments: [] }));

    await model.applyAttributionResolution({ 'reference:ref-a': 'mine' });
    await flushPromises();

    expect(flaw.value.references.filter(item => item.uuid === 'ref-c')).toHaveLength(1);
    expect(flaw.value.references).toHaveLength(2);
    expect(model.pendingAttributionConflict.value).toBeNull();
  });

  it('stops saving references when the user navigates to another flaw mid-save', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loadFlaw([reference(), reference({ uuid: 'ref-b', url: 'https://example.com/b' })]);
    const model = mountModel();
    const first = reference({ url: 'https://example.com/a-edited' });
    const second = reference({ uuid: 'ref-b', url: 'https://example.com/b-edited' });
    flaw.value.references = [first, second];

    let resolveFirstPut!: (response: unknown) => void;
    vi.mocked(putFlawReference).mockImplementationOnce(() => new Promise((resolve) => {
      resolveFirstPut = resolve;
    }) as any);

    const saving = model.saveReferences([first, second]);
    // The user navigates while the first PUT is still in flight.
    setFlaw({ ...serverFlaw({ references: [], acknowledgments: [] }), uuid: 'flaw-2' });
    resolveFirstPut({ data: {} });
    await saving;
    await flushPromises();

    // Only the item saved before the navigation was written, and it went to
    // the flaw the save started on.
    expect(putFlawReference).toHaveBeenCalledTimes(1);
    expect(putFlawReference).toHaveBeenCalledWith(
      'flaw-1',
      'ref-a',
      expect.objectContaining({ url: 'https://example.com/a-edited' }),
      { suppressConflictToast: true },
    );
    expect(getFlaw).not.toHaveBeenCalledWith('flaw-2', true);
    expect(isSaving.value).toBe(false);
  });

  it('ignores a dialog resolution after the user navigated to another flaw', async () => {
    const { model } = await stageReferenceConflict();
    setFlaw({ ...serverFlaw({ references: [], acknowledgments: [] }), uuid: 'flaw-2' });

    vi.mocked(putFlawReference).mockClear();
    await model.applyAttributionResolution({ 'reference:ref-a': 'mine' });

    expect(putFlawReference).not.toHaveBeenCalled();
    expect(postFlawReference).not.toHaveBeenCalled();
    expect(deleteFlawReference).not.toHaveBeenCalled();
    // The staged conflict survives for the flaw it belongs to.
    expect(model.pendingAttributionConflict.value).not.toBeNull();
    expect(isSaving.value).toBe(false);
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
    // Staging must not advance the baseline: a canceled dialog has to be able
    // to re-detect the conflict on the next save.
    expect(initialFlaw.value.references).toEqual([reference()]);
    expect(isFlawUpdated.value).toBe(true);
  });

  it('re-stages a canceled conflict on the next save', async () => {
    loadFlaw([reference()]);
    const model = mountModel();
    const pendingConflict = model.pendingAttributionConflict;
    const edited = reference({ url: 'https://example.com/a-edited' });
    flaw.value.references = [edited];
    const serverCopy = reference({ url: 'https://example.com/a-server', updated_dt: '2024-06-01T00:00:00Z' });
    model.mergeServerAttributions({ references: [serverCopy], acknowledgments: [] });
    expect(pendingConflict.value).not.toBeNull();
    // The user dismisses the dialog without choosing anything.
    pendingConflict.value = null;

    vi.mocked(putFlawReference).mockRejectedValueOnce({ response: { status: 409 } });
    vi.mocked(getFlaw).mockResolvedValueOnce(serverFlaw({ references: [serverCopy], acknowledgments: [] }));

    await expect(model.saveReferences([edited])).rejects.toMatchObject({ response: { status: 409 } });

    expect(model.pendingAttributionConflict.value?.references?.conflicts).toEqual([
      expect.objectContaining({ kind: 'reference', uuid: 'ref-a' }),
    ]);
    expect(flaw.value.references).toEqual([edited]);
    // The page-load baseline survived staging and cancellation, so the save
    // re-detected the conflict instead of silently swallowing it.
    expect(initialFlaw.value.references).toEqual([reference()]);
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

  it('baselines a confirmed reference removal while other items remain in the baseline', async () => {
    // The baseline update clones the remaining items out of the readonly
    // initialFlaw collection; the clone must not choke on the Vue proxies.
    const remaining = reference({ uuid: 'ref-b', url: 'https://example.com/b' });
    loadFlaw([reference(), remaining]);
    const model = mountModel();
    vi.mocked(deleteFlawReference).mockRejectedValueOnce({ response: { status: 404, data: 'Not found.' } });

    await model.deleteReference('ref-a');

    expect(flaw.value.references).toEqual([remaining]);
    expect(initialFlaw.value.references).toEqual([remaining]);
    expect(isSaving.value).toBe(false);
  });

  it('baselines a confirmed acknowledgment removal while other items remain in the baseline', async () => {
    const remaining = acknowledgment({ uuid: 'ack-2', name: 'second name' });
    loadFlaw([], [acknowledgment(), remaining]);
    const model = mountModel();
    vi.mocked(deleteFlawAcknowledgment).mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Acknowledgment does not exist.' } },
    });

    await model.deleteAcknowledgment('ack-1');

    expect(flaw.value.acknowledgments).toEqual([remaining]);
    expect(initialFlaw.value.acknowledgments).toEqual([remaining]);
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
