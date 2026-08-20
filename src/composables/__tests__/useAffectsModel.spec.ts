import { createTestingPinia } from '@pinia/testing';

import { useAffectsModel } from '@/composables/useAffectsModel';
import * as AffectService from '@/services/AffectService';
import type { ZodAffectType } from '@/types';

createTestingPinia();

vi.mock('@/services/AffectService', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/AffectService')>(),
  postAffectCvssScore: vi.fn(),
  postAffects: vi.fn(),
  putAffectCvssScore: vi.fn(),
  putAffects: vi.fn(),
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
    const { actions: { initializeAffects } } = useAffectsModel();
    initializeAffects([]);
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
});
