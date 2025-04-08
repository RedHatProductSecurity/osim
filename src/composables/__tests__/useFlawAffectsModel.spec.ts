import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { mockAffect, osimFullFlawTest } from '@/components/__tests__/test-suite-helpers';

import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';
import type { ZodFlawType } from '@/types';
import { postAffects, deleteAffects } from '@/services/AffectService';
import { getFlaw } from '@/services/FlawService';

import { useMockFlawWithModules } from './helpers';

vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock('@/services/AffectService');
vi.mock('@/services/FlawService');

const makeMocksWith = async (flaw: ZodFlawType) => await useMockFlawWithModules(flaw, vi)({
  useFlaw: '@/composables/useFlaw',
  useFlawAffectsModel: '@/composables/useFlawAffectsModel',
});

describe('useFlawAffectsModel', () => {
  beforeAll(async () => {
    setActivePinia(createTestingPinia());
  });

  // afterEach(() => {
  //   vi.clearAllMocks();
  // });

  osimFullFlawTest('should return the expected values', async ({ flaw }) => {
    const { useFlawAffectsModel } = await makeMocksWith(flaw);
    const composable = useFlawAffectsModel();
    expect(composable).toBeDefined();
    expect(composable).toBeInstanceOf(Object);

    [
      'addAffect',
      'removeAffect',
      'recoverAffect',
      'saveAffects',
      'removeAffects',
      'updateAffectCvss',
      'affectsToDelete',
      'affectCvssToDelete',
      'initialAffects',
      'refreshAffects',
      'modifiedAffects',
      'wereAffectsEditedOrAdded',
    ].forEach((key) => {
      expect(composable).toHaveProperty(key);
    });
  });

  osimFullFlawTest('should add an affect', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { addAffect, wereAffectsEditedOrAdded } = useFlawAffectsModel();
    const { flaw } = useFlaw();
    const initialAffectsCount = flaw.value.affects.length;

    addAffect({
      embargoed: false,
      ps_module: 'rhel-8',
      ps_component: 'kernel',
      affectedness: 'AFFECTED',
      resolution: 'DELEGATED',
      impact: 'LOW',
      cvss_scores: [],
      alerts: [],
      trackers: [],
    });

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    expect(flaw.value.affects.length).toBe(initialAffectsCount + 1);
  });

  osimFullFlawTest('should remove an affect', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);

    const { flaw } = useFlaw();
    const { affectsToDelete, removeAffect } = useFlawAffectsModel();

    removeAffect(flaw.value.affects[0]);

    expect(affectsToDelete.value.length).toBe(1);
  });

  osimFullFlawTest('should update an affect', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { flaw } = useFlaw();
    const { modifiedAffects, wereAffectsEditedOrAdded } = useFlawAffectsModel();

    flaw.value.affects[0].impact = 'CRITICAL';

    expect(modifiedAffects.value.length).toBe(1);
    expect(wereAffectsEditedOrAdded.value).toBe(true);
  });

  osimFullFlawTest('should update an affect CVSS', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { flaw } = useFlaw();
    const { updateAffectCvss, wereAffectsEditedOrAdded } = useFlawAffectsModel();

    updateAffectCvss(flaw.value.affects[0], 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 7.8, -1);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
  });

  osimFullFlawTest('should delete an affect CVSS', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { flaw } = useFlaw();
    flaw.value.affects[0].cvss_scores.push({
      issuer: IssuerEnum.Rh,
      cvss_version: CVSS_V3,
      score: 7.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      uuid: '123',
      alerts: [],
    });
    const { affectCvssToDelete, updateAffectCvss, wereAffectsEditedOrAdded } = useFlawAffectsModel();

    updateAffectCvss(flaw.value.affects[0], '', null, 0);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    expect(affectCvssToDelete.value).toHaveProperty(flaw.value.affects[0].uuid!);
    expect(affectCvssToDelete.value[flaw.value.affects[0].uuid!]).toBe('123');
  });

  osimFullFlawTest('should delete an affect CVSS', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { flaw } = useFlaw();
    flaw.value.affects[0].cvss_scores.push({
      issuer: IssuerEnum.Rh,
      cvss_version: CVSS_V3,
      score: 7.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      uuid: '123',
      alerts: [],
    });
    const { affectCvssToDelete, updateAffectCvss, wereAffectsEditedOrAdded } = useFlawAffectsModel();

    updateAffectCvss(flaw.value.affects[0], '', null, 0);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    expect(affectCvssToDelete.value).toHaveProperty(flaw.value.affects[0].uuid!);
    expect(affectCvssToDelete.value[flaw.value.affects[0].uuid!]).toBe('123');
  });

  osimFullFlawTest('should recover an affect', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { flaw } = useFlaw();
    const { affectsToDelete, recoverAffect } = useFlawAffectsModel();
    const affect = flaw.value.affects[0];

    affectsToDelete.value.push(affect);

    recoverAffect(affect);

    expect(affectsToDelete.value.length).toBe(0);
  });

  osimFullFlawTest('should remove affects', async ({ flaw: _flaw }) => {
    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { flaw } = useFlaw();
    const { removeAffects } = useFlawAffectsModel();
    const affectsToDelete = flaw.value.affects.map(({ uuid }: { uuid: string }) => uuid);
    flaw.value.affects.splice(0, flaw.value.affects.length);
    removeAffects();

    expect(deleteAffects).toHaveBeenCalledWith(affectsToDelete);
    expect(flaw.value.affects.length).toBe(0);
  });

  osimFullFlawTest('should save new affects', async ({ flaw: _flaw }) => {
    vi.mocked(getFlaw).mockResolvedValue(_flaw);

    const { useFlaw, useFlawAffectsModel } = await makeMocksWith(_flaw);
    const { saveAffects, wereAffectsEditedOrAdded } = useFlawAffectsModel();
    const { flaw } = useFlaw();
    const fakeAffect = mockAffect({ ps_component: 'component1', ps_module: 'module1' });
    flaw.value.affects.push(fakeAffect);

    vi.mocked(postAffects).mockResolvedValue({ data:
      { results:
      [...flaw.value.affects, fakeAffect] } });

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    await saveAffects();
    expect(postAffects).toHaveBeenCalled();
  });
});
