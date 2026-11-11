import { createTestingPinia } from '@pinia/testing';

import { useAffectsModel } from '@/composables/useAffectsModel';
import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import * as AffectService from '@/services/AffectService';
import * as TrackerService from '@/services/TrackerService';
import type { ZodAffectType, ZodTrackerType } from '@/types';

createTestingPinia();

vi.mock('@/services/AffectService', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/AffectService')>(),
  deleteAffects: vi.fn(),
  getAffect: vi.fn(),
  getAffects: vi.fn(),
  postAffectCvssScore: vi.fn(),
  postAffects: vi.fn(),
  putAffectCvssScore: vi.fn(),
  putAffects: vi.fn(),
}));

vi.mock('@/services/TrackerService', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/TrackerService')>(),
  findExistingTracker: vi.fn(),
  updateExistingTracker: vi.fn(),
}));

// New rows are created with an empty ps_module (see useAffectsTable.ts createData);
// OSIDB derives ps_module from ps_update_stream server-side and returns it filled in.
function newLocalAffect(overrides: Partial<ZodAffectType> = {}): ZodAffectType {
  return {
    _uuid: 'local-uuid',
    flaw: 'flaw-uuid',
    ps_module: '',
    ps_component: 'my-component',
    ps_update_stream: 'my-stream',
    embargoed: false,
    alerts: [],
    labels: [],
    cvss_scores: [
      {
        comment: '',
        cvss_version: 'V3',
        issuer: 'RH',
        score: 7.5,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
        embargoed: false,
        alerts: [],
      },
    ],
    tracker: null,
    subpackage_purls: [],
    ...overrides,
  } as unknown as ZodAffectType;
}

function duplicateCreateError() {
  return {
    response: {
      status: 400,
      data: {
        results: [],
        failed: [{
          index: 0,
          errors: {
            __all__: ['Affect with this Flaw, Ps update stream and Ps component already exists.'],
          },
        }],
      },
    },
  };
}

function savedAffectFromOsidb(overrides: Partial<ZodAffectType> = {}): ZodAffectType {
  return {
    uuid: 'saved-uuid',
    flaw: 'flaw-uuid',
    ps_module: 'my-module', // derived server-side from ps_update_stream
    ps_component: 'my-component',
    ps_update_stream: 'my-stream',
    embargoed: false,
    alerts: [],
    labels: [],
    cvss_scores: [],
    tracker: null,
    subpackage_purls: [],
    ...overrides,
  } as unknown as ZodAffectType;
}

async function promoteDifferingDuplicate() {
  useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
  const model = useAffectsModel();
  const localAffect = newLocalAffect({ cvss_scores: [], impact: 'CRITICAL' });
  const localId = localAffect._uuid!;
  model.state.currentAffects.value = [localAffect];
  model.actions.markNew(localId);
  vi.mocked(AffectService.postAffects).mockRejectedValue(duplicateCreateError());
  vi.mocked(AffectService.getAffects).mockResolvedValue({
    data: {
      results: [savedAffectFromOsidb({
        cvss_scores: [],
        impact: 'IMPORTANT',
        updated_dt: '2026-03-01T00:00:00Z',
      })],
    },
  } as any);
  await expect(model.actions.saveAffects()).rejects.toThrow('Affect already exists');
  return { localId, model };
}

describe('useAffectsModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlaw().resetFlaw();
    const { actions: { initializeAffects } } = useAffectsModel();
    initializeAffects([]);
  });

  const linkedTracker = {
    uuid: 'tracker-uuid',
    external_system_id: 'OSIDB-12',
    type: 'JIRA',
    affects: ['source-uuid'],
    ps_update_stream: 'my-stream',
    embargoed: true,
    updated_dt: '2026-01-01T00:00:00Z',
    status: 'OPEN',
  } as ZodTrackerType;

  function setupLink() {
    const affect = savedAffectFromOsidb();
    const { flaw, initialFlaw, setFlaw } = useFlaw();
    setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [affect] });
    const model = useAffectsModel();
    model.actions.initializeAffects([affect]);
    vi.mocked(TrackerService.findExistingTracker).mockResolvedValue(linkedTracker);
    vi.mocked(TrackerService.updateExistingTracker).mockResolvedValue(linkedTracker);
    vi.mocked(AffectService.getAffect).mockImplementation(async uuid =>
      uuid === 'source-uuid'
        ? savedAffectFromOsidb({ uuid: 'source-uuid' })
        : savedAffectFromOsidb(),
    );
    return { affect: model.state.currentAffects.value[0], model, flaw, initialFlaw };
  }

  it('links a persisted affect without losing unsaved fields or reset baselines', async () => {
    const { affect, flaw, initialFlaw, model } = setupLink();
    flaw.value.title = 'unsaved flaw title';
    affect.impact = 'LOW' as ZodAffectType['impact'];
    model.actions.markModified(affect.uuid!);
    const updated = savedAffectFromOsidb({
      updated_dt: '2026-02-01T00:00:00Z', tracker: linkedTracker,
    });
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb())
      .mockResolvedValueOnce(savedAffectFromOsidb({ uuid: 'source-uuid' }))
      .mockResolvedValueOnce(updated);

    expect(await model.actions.linkExistingTracker(affect, 'osidb-12')).toEqual({ refreshFailed: false });
    expect(TrackerService.updateExistingTracker).toHaveBeenCalledWith(linkedTracker, affect.uuid);
    expect(model.state.currentAffects.value[0]).toMatchObject({ impact: 'LOW',
      tracker: linkedTracker,
      updated_dt: updated.updated_dt });
    expect(model.state.initialAffects.value[0].impact).not.toBe('LOW');
    model.actions.revertAffect(affect.uuid!);
    expect(model.state.currentAffects.value[0].tracker?.uuid).toBe(linkedTracker.uuid);
    expect(flaw.value.title).toBe('unsaved flaw title');
    expect(initialFlaw.value.title).not.toBe('unsaved flaw title');
    expect(initialFlaw.value.affects[0].tracker?.uuid).toBe(linkedTracker.uuid);
    expect(flaw.value.affects[0].tracker?.uuid).toBe(linkedTracker.uuid);
  });

  it('reflects a successful PUT even if the post-save affect GET fails', async () => {
    const { affect, model } = setupLink();
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb())
      .mockResolvedValueOnce(savedAffectFromOsidb({ uuid: 'source-uuid' }))
      .mockRejectedValueOnce(new Error('network'));
    expect(await model.actions.linkExistingTracker(affect, 'OSIDB-12')).toEqual({ refreshFailed: true });
    expect(model.state.currentAffects.value[0].tracker?.uuid).toBe(linkedTracker.uuid);
  });

  it('never overwrites a different tracker or PUTs an already-linked target', async () => {
    const { affect, model } = setupLink();
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb({
      tracker: { ...linkedTracker, uuid: 'other-tracker' },
    }));
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('different tracker');
    expect(TrackerService.updateExistingTracker).not.toHaveBeenCalled();

    affect.tracker = { ...linkedTracker, uuid: 'other-tracker' };
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('different tracker');
    affect.tracker = null;
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb({ tracker: linkedTracker }));
    expect(await model.actions.linkExistingTracker(affect, 'OSIDB-12')).toEqual({ refreshFailed: false });
    expect(TrackerService.updateExistingTracker).not.toHaveBeenCalled();
  });

  it('rejects new, changed, removed, and mismatching affects before PUT', async () => {
    const { affect, model } = setupLink();
    await expect(model.actions.linkExistingTracker(newLocalAffect(), 'OSIDB-12')).rejects.toThrow('Save this affect');
    affect.ps_component = 'unsaved-component';
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('Save affect stream');
    affect.ps_component = 'my-component';
    model.actions.markRemoved(affect.uuid!);
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('Save this affect');
    model.state.removedAffects.clear();
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb({ flaw: 'other-flaw' }));
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('changed');
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb({ ps_component: 'changed' }));
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('changed');
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb())
      .mockResolvedValueOnce(savedAffectFromOsidb({ uuid: 'source-uuid', ps_component: 'changed' }));
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('do not match');
    expect(TrackerService.updateExistingTracker).not.toHaveBeenCalled();
  });

  it('defers source validation to the backend when that affect is inaccessible', async () => {
    const { affect, model } = setupLink();
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb())
      .mockRejectedValueOnce({ response: { status: 403 } })
      .mockResolvedValueOnce(savedAffectFromOsidb({ tracker: linkedTracker }));
    expect(await model.actions.linkExistingTracker(affect, 'OSIDB-12')).toEqual({ refreshFailed: false });
    expect(TrackerService.updateExistingTracker).toHaveBeenCalledTimes(1);
  });

  it('checks another source when the first one is inaccessible', async () => {
    const { affect, model } = setupLink();
    vi.mocked(TrackerService.findExistingTracker).mockResolvedValue({
      ...linkedTracker, affects: ['restricted-uuid', 'source-uuid'],
    });
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb())
      .mockRejectedValueOnce({ response: { status: 403 } })
      .mockResolvedValueOnce(savedAffectFromOsidb({ uuid: 'source-uuid', ps_component: 'wrong' }));
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('do not match');
    expect(TrackerService.updateExistingTracker).not.toHaveBeenCalled();
  });

  it('does not advance a stale affect baseline over another analyst’s changes', async () => {
    const { affect, model } = setupLink();
    affect.updated_dt = '2026-01-01T00:00:00Z';
    model.actions.initializeAffects([affect]);
    vi.mocked(AffectService.getAffect).mockResolvedValueOnce(savedAffectFromOsidb({
      updated_dt: '2026-02-01T00:00:00Z', impact: 'IMPORTANT' as ZodAffectType['impact'],
    }));

    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toThrow('Reload before linking');
    expect(TrackerService.updateExistingTracker).not.toHaveBeenCalled();
    expect(model.state.initialAffects.value[0].updated_dt).toBe(affect.updated_dt);
  });

  it('passes through a 409 without retrying or changing baselines', async () => {
    const { affect, model } = setupLink();
    const error = { response: { status: 409 } };
    vi.mocked(TrackerService.updateExistingTracker).mockRejectedValue(error);
    await expect(model.actions.linkExistingTracker(affect, 'OSIDB-12')).rejects.toBe(error);
    expect(TrackerService.updateExistingTracker).toHaveBeenCalledTimes(1);
    expect(model.state.initialAffects.value[0].tracker).toBeNull();
  });

  it('does not update a different flaw after navigation during the PUT', async () => {
    const { affect, model } = setupLink();
    vi.mocked(TrackerService.updateExistingTracker).mockImplementation(async () => {
      useFlaw().setFlaw({ ...blankFlaw(), uuid: 'another-flaw', affects: [] });
      model.actions.initializeAffects([]);
      return linkedTracker;
    });
    await model.actions.linkExistingTracker(affect, 'OSIDB-12');
    expect(useFlaw().flaw.value.affects).toEqual([]);
    expect(model.state.currentAffects.value).toEqual([]);
  });

  it('saves the CVSS score for a newly created affect even when OSIDB fills in ps_module', async () => {
    const { actions: { markNew, saveAffects }, state: { currentAffects } } = useAffectsModel();

    const localAffect = newLocalAffect();
    currentAffects.value = [localAffect];
    markNew(localAffect._uuid!);

    const savedAffect = savedAffectFromOsidb();
    vi.mocked(AffectService.postAffects).mockResolvedValue({
      data: { results: [savedAffect], failed: [] },
    } as any);
    vi.mocked(AffectService.postAffectCvssScore).mockResolvedValue({
      uuid: 'cvss-uuid',
      affect: savedAffect.uuid,
      ...localAffect.cvss_scores[0],
    } as any);

    await saveAffects();

    expect(AffectService.postAffectCvssScore).toHaveBeenCalledWith(
      savedAffect.uuid,
      expect.objectContaining({ score: 7.5 }),
    );
  });

  it('clears newAffects tracking for a saved affect despite the ps_module mismatch', async () => {
    const { actions: { markNew, resetSavedAffects }, state: { currentAffects, newAffects } } = useAffectsModel();

    const localAffect = newLocalAffect({ cvss_scores: [] });
    currentAffects.value = [localAffect];
    markNew(localAffect._uuid!);

    resetSavedAffects([savedAffectFromOsidb()]);

    expect(newAffects.has(localAffect._uuid!)).toBe(false);
  });

  it('adopts the server identity so later edits to a saved new affect are persisted', async () => {
    const {
      actions: { markModified, markNew, resetSavedAffects, saveAffects },
      state: { currentAffects },
    } = useAffectsModel();

    const localAffect = newLocalAffect({ cvss_scores: [] });
    currentAffects.value = [localAffect];
    markNew(localAffect._uuid!);

    resetSavedAffects([savedAffectFromOsidb({ cvss_scores: [] })]);

    // The saved affect replaces the local one in place (no duplicate row) and
    // carries the server-derived uuid and ps_module.
    expect(currentAffects.value).toHaveLength(1);
    const [reconciled] = currentAffects.value;
    expect(reconciled.uuid).toBe('saved-uuid');
    expect(reconciled.ps_module).toBe('my-module');

    // A later edit must be classified as an update (PUT) rather than dropped.
    markModified(reconciled.uuid!);
    vi.mocked(AffectService.putAffects).mockResolvedValue({
      data: { results: [savedAffectFromOsidb({ cvss_scores: [] })], failed: [] },
    } as any);

    await saveAffects();

    expect(AffectService.postAffects).not.toHaveBeenCalled();
    expect(AffectService.putAffects).toHaveBeenCalledWith([
      expect.objectContaining({ uuid: 'saved-uuid' }),
    ], { suppressConflictToast: true });
  });

  it('adopts a new affect when the server already has the same one', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const { actions: { markNew, saveAffects }, state: { currentAffects, newAffects } } = useAffectsModel();
    const localAffect = newLocalAffect({ cvss_scores: [] });
    currentAffects.value = [localAffect];
    markNew(localAffect._uuid!);

    const server = savedAffectFromOsidb({ cvss_scores: [], updated_dt: '2026-03-01T00:00:00Z' });
    vi.mocked(AffectService.postAffects).mockRejectedValue(duplicateCreateError());
    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: { results: [server] },
    } as any);

    await saveAffects();

    expect(currentAffects.value).toHaveLength(1);
    expect(currentAffects.value[0]).toMatchObject({
      ps_module: 'my-module',
      updated_dt: '2026-03-01T00:00:00Z',
      uuid: 'saved-uuid',
    });
    expect(newAffects.size).toBe(0);
    expect(AffectService.getAffects).toHaveBeenCalledWith('flaw-uuid', undefined, true);
  });

  it('asks which value to keep when the existing affect differs', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { markNew, saveAffects },
      state: { currentAffects, initialAffects, modifiedAffects, pendingAffectConflict },
    } = useAffectsModel();
    const localAffect = newLocalAffect({ cvss_scores: [], impact: 'CRITICAL' });
    currentAffects.value = [localAffect];
    markNew(localAffect._uuid!);

    vi.mocked(AffectService.postAffects).mockRejectedValue(duplicateCreateError());
    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: {
        results: [savedAffectFromOsidb({
          cvss_scores: [],
          impact: 'IMPORTANT',
          updated_dt: '2026-03-01T00:00:00Z',
        })],
      },
    } as any);

    await expect(saveAffects()).rejects.toThrow('Affect already exists');

    expect(pendingAffectConflict.value?.conflicts).toEqual([
      expect.objectContaining({ field: 'impact', mine: 'CRITICAL', server: 'IMPORTANT' }),
    ]);
    expect(currentAffects.value[0]).toMatchObject({ impact: 'CRITICAL', uuid: 'saved-uuid' });
    expect(currentAffects.value[0]._uuid).toBeUndefined();
    expect(initialAffects.value[0]).toMatchObject({ impact: 'IMPORTANT', uuid: 'saved-uuid' });
    expect(modifiedAffects.has('saved-uuid')).toBe(true);
    expect(AffectService.putAffects).not.toHaveBeenCalled();
  });

  it('reverts a promoted affect from its old row id back to the server value', async () => {
    const { localId, model } = await promoteDifferingDuplicate();
    model.state.pendingAffectConflict.value = null;

    model.actions.revertAffect(localId);

    expect(model.state.currentAffects.value[0]).toMatchObject({ impact: 'IMPORTANT', uuid: 'saved-uuid' });
    expect(model.state.modifiedAffects.has('saved-uuid')).toBe(false);
  });

  it('deletes a promoted affect when the selection still has the old row id', async () => {
    const { localId, model } = await promoteDifferingDuplicate();

    model.actions.markRemoved(localId);

    expect(model.state.removedAffects.has('saved-uuid')).toBe(true);
    expect(model.state.removedAffects.has(localId)).toBe(false);
    expect(model.state.currentAffects.value).toHaveLength(1);
  });

  it('asks whether to keep an edit when the server affect was deleted', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { applyAffectResolution, initializeAffects, markModified, saveAffects },
      state: { currentAffects, pendingAffectConflict },
    } = useAffectsModel();
    const affect = savedAffectFromOsidb({
      cvss_scores: [],
      impact: 'LOW',
      updated_dt: '2026-01-01T00:00:00Z',
    });
    initializeAffects([affect]);
    currentAffects.value[0].impact = 'CRITICAL';
    markModified(affect.uuid!);

    vi.mocked(AffectService.putAffects).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(AffectService.getAffects).mockResolvedValue({ data: { results: [] } } as any);

    await expect(saveAffects()).rejects.toMatchObject({ response: { status: 404 } });

    expect(pendingAffectConflict.value?.conflicts).toEqual([
      expect.objectContaining({ field: 'removed', id: `${affect.uuid}:removed`, server: 'Removed' }),
    ]);
    expect(AffectService.putAffects).toHaveBeenCalledTimes(1);

    applyAffectResolution({ [`${affect.uuid}:removed`]: 'server' });
    expect(currentAffects.value).toEqual([]);
  });

  it('drops the old affect id when keeping a local edit of a deleted affect', async () => {
    const affect = savedAffectFromOsidb({
      cvss_scores: [],
      impact: 'CRITICAL',
      updated_dt: '2026-01-01T00:00:00Z',
    });
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [affect] });
    const {
      actions: { applyAffectResolution, initializeAffects, markModified, saveAffects },
      state: { currentAffects, newAffects },
    } = useAffectsModel();
    initializeAffects([affect]);
    currentAffects.value[0].impact = 'CRITICAL';
    markModified(affect.uuid!);
    vi.mocked(AffectService.putAffects).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(AffectService.getAffects).mockResolvedValue({ data: { results: [] } } as any);

    await expect(saveAffects()).rejects.toMatchObject({ response: { status: 404 } });
    applyAffectResolution({ [`${affect.uuid}:removed`]: 'mine' });

    expect(useFlaw().flaw.value.affects.map(row => row.uuid)).toEqual([]);
    expect(newAffects.size).toBe(1);
    expect(currentAffects.value[0].uuid).toBeNull();
    expect(currentAffects.value[0].impact).toBe('CRITICAL');
  });

  it('drops an affect that was already deleted on the server', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { initializeAffects, markRemoved, removeAffects },
      state: { currentAffects, removedAffects },
    } = useAffectsModel();
    const affect = savedAffectFromOsidb({ cvss_scores: [] });
    initializeAffects([affect]);
    markRemoved(affect.uuid!);

    vi.mocked(AffectService.deleteAffects).mockRejectedValue({
      response: { data: { uuid: ['Affect matching query does not exist.'] }, status: 400 },
    });
    vi.mocked(AffectService.getAffects).mockResolvedValue({ data: { results: [] } } as any);

    await expect(removeAffects()).resolves.toEqual({ deletedUuids: [affect.uuid], hasErrors: false });
    expect(currentAffects.value).toEqual([]);
    expect(removedAffects.size).toBe(0);
  });

  it('asks before deleting an affect the server has edited', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { applyAffectResolution, initializeAffects, markRemoved, removeAffects },
      state: { currentAffects, pendingAffectConflict, removedAffects },
    } = useAffectsModel();
    const affect = savedAffectFromOsidb({
      cvss_scores: [],
      impact: 'LOW',
      updated_dt: '2026-01-01T00:00:00Z',
    });
    initializeAffects([affect]);
    markRemoved(affect.uuid!);

    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: {
        results: [savedAffectFromOsidb({
          cvss_scores: [],
          impact: 'IMPORTANT',
          updated_dt: '2026-03-01T00:00:00Z',
        })],
      },
    } as any);

    await expect(removeAffects()).rejects.toThrow('Affect was edited on the server');
    expect(AffectService.deleteAffects).not.toHaveBeenCalled();
    expect(pendingAffectConflict.value?.conflicts).toEqual([
      expect.objectContaining({ field: 'deleted', mine: 'Deleted', server: 'Impact: IMPORTANT' }),
    ]);

    applyAffectResolution({ [`${affect.uuid}:deleted`]: 'server' });
    expect(removedAffects.size).toBe(0);
    expect(currentAffects.value[0]).toMatchObject({ impact: 'IMPORTANT', uuid: affect.uuid });
  });

  it('adds an affect that only the server has', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { initializeAffects, integrateServerAffects, markNew },
      state: { currentAffects, initialAffects },
    } = useAffectsModel();
    const local = savedAffectFromOsidb({ cvss_scores: [], ps_component: 'local-component', uuid: 'local-uuid' });
    initializeAffects([local]);
    const draft = newLocalAffect({
      _uuid: 'draft-uuid',
      cvss_scores: [],
      ps_component: 'draft-component',
      ps_update_stream: 'draft-stream',
    });
    currentAffects.value = [...currentAffects.value, draft];
    markNew(draft._uuid!);

    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: {
        results: [
          local,
          savedAffectFromOsidb({ cvss_scores: [], ps_component: 'server-component', uuid: 'server-uuid' }),
          savedAffectFromOsidb({
            cvss_scores: [],
            ps_component: 'draft-component',
            ps_update_stream: 'draft-stream',
            uuid: 'draft-server-uuid',
          }),
        ],
      },
    } as any);

    await integrateServerAffects();

    expect(currentAffects.value.map(affect => affect.uuid ?? affect._uuid)).toEqual([
      'local-uuid',
      'draft-uuid',
      'server-uuid',
    ]);
    expect(initialAffects.value.map(affect => affect.uuid)).toEqual(['local-uuid', 'server-uuid']);
    expect(useFlaw().flaw.value.affects.map(affect => affect.uuid)).toEqual(['server-uuid']);
  });

  it('drops an affect reload that finishes after the flaw changes', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-a', affects: [] });
    const { actions: { initializeAffects, integrateServerAffects }, state: { currentAffects } } = useAffectsModel();
    initializeAffects([]);
    vi.mocked(AffectService.getAffects).mockImplementation(async () => {
      useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-b', affects: [] });
      initializeAffects([]);
      return { data: { results: [savedAffectFromOsidb({ cvss_scores: [], uuid: 'server-uuid' })] } } as any;
    });

    await integrateServerAffects();

    expect(useFlaw().flaw.value.uuid).toBe('flaw-b');
    expect(useFlaw().flaw.value.affects).toEqual([]);
    expect(currentAffects.value).toEqual([]);
  });

  it('reports bulk update failures so the failed edit stays queued', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { initializeAffects, markModified, saveAffects },
      state: { currentAffects, modifiedAffects },
    } = useAffectsModel();
    const kept = savedAffectFromOsidb({ cvss_scores: [], uuid: 'kept-uuid' });
    const failed = savedAffectFromOsidb({ cvss_scores: [], ps_component: 'other', uuid: 'failed-uuid' });
    initializeAffects([kept, failed]);
    currentAffects.value[0].impact = 'CRITICAL';
    currentAffects.value[1].impact = 'CRITICAL';
    markModified('kept-uuid');
    markModified('failed-uuid');
    vi.mocked(AffectService.putAffects).mockResolvedValue({
      data: {
        failed: [{ errors: { impact: ['invalid'] }, index: 1 }],
        results: [savedAffectFromOsidb({ cvss_scores: [], impact: 'CRITICAL', uuid: 'kept-uuid' })],
      },
    } as any);

    await expect(saveAffects()).resolves.toMatchObject({ hasErrors: true });

    expect(modifiedAffects.has('kept-uuid')).toBe(false);
    expect(modifiedAffects.has('failed-uuid')).toBe(true);
    expect(currentAffects.value[1].impact).toBe('CRITICAL');
  });

  it('reports failures from the retry after a disjoint affect update', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { initializeAffects, markModified, saveAffects },
      state: { currentAffects, modifiedAffects },
    } = useAffectsModel();
    const affect = savedAffectFromOsidb({ cvss_scores: [], impact: 'LOW', updated_dt: '2026-01-01T00:00:00Z' });
    initializeAffects([affect]);
    currentAffects.value[0].impact = 'CRITICAL';
    markModified(affect.uuid!);
    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: { results: [savedAffectFromOsidb({ cvss_scores: [], impact: 'LOW', updated_dt: '2026-03-01T00:00:00Z' })] },
    } as any);
    vi.mocked(AffectService.putAffects)
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValueOnce({
        data: { failed: [{ errors: { impact: ['invalid'] }, index: 0 }], results: [] },
      } as any);

    await expect(saveAffects()).resolves.toMatchObject({ hasErrors: true });

    expect(AffectService.putAffects).toHaveBeenCalledTimes(2);
    expect(modifiedAffects.has(affect.uuid!)).toBe(true);
    expect(currentAffects.value[0].impact).toBe('CRITICAL');
  });

  it('posts the local CVSS score when an identical affect is adopted', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const { actions: { markNew, saveAffects }, state: { currentAffects, newAffects } } = useAffectsModel();
    const localAffect = newLocalAffect();
    currentAffects.value = [localAffect];
    markNew(localAffect._uuid!);
    vi.mocked(AffectService.postAffects).mockRejectedValue(duplicateCreateError());
    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: { results: [savedAffectFromOsidb({ cvss_scores: [] })] },
    } as any);
    vi.mocked(AffectService.postAffectCvssScore).mockResolvedValue({
      affect: 'saved-uuid',
      score: 7.5,
      uuid: 'cvss-uuid',
      issuer: 'RH',
      cvss_version: 'V3',
    } as any);

    await saveAffects();

    expect(AffectService.postAffectCvssScore).toHaveBeenCalledWith(
      'saved-uuid',
      expect.objectContaining({ score: 7.5 }),
    );
    expect(newAffects.size).toBe(0);
    expect(currentAffects.value[0].cvss_scores).toEqual([
      expect.objectContaining({ score: 7.5, uuid: 'cvss-uuid' }),
    ]);
  });

  it('posts CVSS for a created affect when a later update conflicts', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { initializeAffects, markModified, markNew, saveAffects },
      state: { currentAffects },
    } = useAffectsModel();
    const existing = savedAffectFromOsidb({ cvss_scores: [], impact: 'LOW', uuid: 'existing-uuid' });
    initializeAffects([existing]);
    const created = newLocalAffect({ _uuid: 'new-uuid', ps_component: 'new-component' });
    currentAffects.value = [...currentAffects.value, created];
    markNew(created._uuid!);
    currentAffects.value[0].impact = 'CRITICAL';
    markModified(existing.uuid!);
    vi.mocked(AffectService.postAffects).mockResolvedValue({
      data: {
        failed: [],
        results: [savedAffectFromOsidb({ cvss_scores: [], ps_component: 'new-component', uuid: 'created-uuid' })],
      },
    } as any);
    vi.mocked(AffectService.putAffects).mockRejectedValue({ response: { status: 409 } });
    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: { results: [savedAffectFromOsidb({ cvss_scores: [], impact: 'IMPORTANT', uuid: 'existing-uuid' })] },
    } as any);
    vi.mocked(AffectService.postAffectCvssScore).mockResolvedValue({
      affect: 'created-uuid',
      score: 7.5,
      uuid: 'cvss-uuid',
      issuer: 'RH',
      cvss_version: 'V3',
    } as any);

    await expect(saveAffects()).rejects.toMatchObject({ response: { status: 409 } });

    expect(AffectService.postAffectCvssScore).toHaveBeenCalledWith(
      'created-uuid',
      expect.objectContaining({ score: 7.5 }),
    );
    expect(currentAffects.value.find(affect => affect.ps_component === 'new-component')).toMatchObject({
      uuid: 'created-uuid',
    });
  });

  it('deletes a confirmed row and still asks about a delete the dialog did not approve', async () => {
    useFlaw().setFlaw({ ...blankFlaw(), uuid: 'flaw-uuid', affects: [] });
    const {
      actions: { initializeAffects, markRemoved, removeAffects },
      state: { currentAffects, pendingAffectConflict, removedAffects },
    } = useAffectsModel();
    const approved = savedAffectFromOsidb({ cvss_scores: [], uuid: 'approved-uuid' });
    const other = savedAffectFromOsidb({
      cvss_scores: [],
      impact: 'LOW',
      ps_component: 'other',
      uuid: 'other-uuid',
    });
    initializeAffects([approved, other]);
    useFlaw().setFlaw({ ...useFlaw().flaw.value, affects: [approved, other] });
    markRemoved(approved.uuid!);
    markRemoved(other.uuid!);
    vi.mocked(AffectService.deleteAffects).mockResolvedValue(undefined as any);
    vi.mocked(AffectService.getAffects).mockResolvedValue({
      data: {
        results: [
          savedAffectFromOsidb({
            cvss_scores: [],
            impact: 'IMPORTANT',
            ps_component: 'other',
            uuid: 'other-uuid',
          }),
        ],
      },
    } as any);

    await expect(removeAffects({ skipCheckFor: [approved.uuid!] })).rejects.toThrow('Affect was edited on the server');

    expect(AffectService.deleteAffects).toHaveBeenCalledTimes(1);
    expect(AffectService.deleteAffects).toHaveBeenCalledWith([approved.uuid], { suppressErrorToast: true });
    expect(currentAffects.value.map(affect => affect.uuid)).toEqual([other.uuid]);
    expect(removedAffects.has(other.uuid!)).toBe(true);
    expect(useFlaw().flaw.value.affects.map(affect => affect.uuid)).toEqual([other.uuid]);
    expect(pendingAffectConflict.value?.conflicts).toEqual([
      expect.objectContaining({ field: 'deleted', id: `${other.uuid}:deleted` }),
    ]);
  });
});
