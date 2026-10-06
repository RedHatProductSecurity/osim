import { createTestingPinia } from '@pinia/testing';

import { useAffectsModel } from '@/composables/useAffectsModel';
import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import * as AffectService from '@/services/AffectService';
import * as TrackerService from '@/services/TrackerService';
import type { ZodAffectType, ZodTrackerType } from '@/types';

createTestingPinia();

vi.mock('@/services/AffectService', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/AffectService')>(),
  getAffect: vi.fn(),
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
    ]);
  });
});
