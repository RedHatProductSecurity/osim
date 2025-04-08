import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { mockAffect, osimFullFlawTest } from '@/components/__tests__/test-suite-helpers';

import { mockModules } from '@/composables/__tests__/helpers';

import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';
import type { ZodFlawType } from '@/types';
import { postAffects, deleteAffects } from '@/services/AffectService';
import { getFlaw } from '@/services/FlawService';

vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock('@/services/AffectService');
vi.mock('@/services/FlawService');

async function useMockedModel(flaw: ZodFlawType) {
  const { _useFlaw, _useFlawAffectsModel } = await mockModules({
    useFlaw: '@/composables/useFlaw',
    useFlawAffectsModel: '@/composables/useFlawAffectsModel',
  }, vi);
  const mockedUseFlaw = _useFlaw();
  mockedUseFlaw.flaw.value = flaw;
  const model = _useFlawAffectsModel();

  return { model, flawRef: mockedUseFlaw.flaw };
}

describe('useFlawAffectsModel', () => {
  beforeAll(async () => {
    setActivePinia(createTestingPinia());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  osimFullFlawTest('should return the expected values', async ({ flaw }) => {
    const { model } = await useMockedModel(flaw);
    expect(model).toBeDefined();
    expect(model).toBeInstanceOf(Object);

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
      expect(model).toHaveProperty(key);
    });
  });

  osimFullFlawTest('should add an affect', async ({ flaw }) => {
    const { flawRef } = await useMockedModel(flaw);

    const { model } = await useMockedModel(flaw);

    const { addAffect, wereAffectsEditedOrAdded } = model;
    const initialAffectsCount = flawRef.value.affects.length;

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
    expect(flawRef.value.affects.length).toBe(initialAffectsCount + 1);
  });

  osimFullFlawTest('should remove an affect', async ({ flaw }) => {
    const { flawRef, model } = await useMockedModel(flaw);
    const { affectsToDelete, removeAffect } = model;

    removeAffect(flawRef.value.affects[0]);

    expect(affectsToDelete.value.length).toBe(1);
  });

  osimFullFlawTest('should update an affect', async ({ flaw }) => {
    const { flawRef, model } = await useMockedModel(flaw);
    const { modifiedAffects, wereAffectsEditedOrAdded } = model;
    flawRef.value.affects[0].impact = 'CRITICAL';

    expect(modifiedAffects.value.length).toBe(1);
    expect(wereAffectsEditedOrAdded.value).toBe(true);
  });

  osimFullFlawTest('should update an affect CVSS', async ({ flaw }) => {
    const { flawRef, model } = await useMockedModel(flaw);
    const { updateAffectCvss, wereAffectsEditedOrAdded } = model;

    updateAffectCvss(flawRef.value.affects[0], 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 7.8, -1);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
  });

  osimFullFlawTest('should delete an affect CVSS', async ({ flaw }) => {
    const { flawRef, model } = await useMockedModel(flaw);
    flawRef.value.affects[0].cvss_scores.push({
      issuer: IssuerEnum.Rh,
      cvss_version: CVSS_V3,
      score: 7.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      uuid: '123',
      alerts: [],
    });
    const { affectCvssToDelete, updateAffectCvss, wereAffectsEditedOrAdded } = model;

    updateAffectCvss(flawRef.value.affects[0], '', null, 0);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    expect(affectCvssToDelete.value).toHaveProperty(flawRef.value.affects[0].uuid!);
    expect(affectCvssToDelete.value[flawRef.value.affects[0].uuid!]).toBe('123');
  });

  osimFullFlawTest('should delete an affect CVSS', async ({ flaw }) => {
    const { flawRef, model } = await useMockedModel(flaw);
    flawRef.value.affects[0].cvss_scores.push({
      issuer: IssuerEnum.Rh,
      cvss_version: CVSS_V3,
      score: 7.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      uuid: '123',
      alerts: [],
    });
    const { affectCvssToDelete, updateAffectCvss, wereAffectsEditedOrAdded } = model;

    updateAffectCvss(flawRef.value.affects[0], '', null, 0);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    expect(affectCvssToDelete.value).toHaveProperty(flawRef.value.affects[0].uuid!);
    expect(affectCvssToDelete.value[flawRef.value.affects[0].uuid!]).toBe('123');
  });

  osimFullFlawTest('should recover an affect', async ({ flaw }) => {
    const { flawRef, model: { affectsToDelete, recoverAffect } } = await useMockedModel(flaw);
    const affect = flawRef.value.affects[0];

    affectsToDelete.value.push(affect);

    recoverAffect(affect);

    expect(affectsToDelete.value.length).toBe(0);
  });

  osimFullFlawTest('should remove affects', async ({ flaw }) => {
    const { flawRef, model: { removeAffects } } = await useMockedModel(flaw);
    const affectsToDelete = flawRef.value.affects.map(({ uuid }: { uuid: string }) => uuid);
    flawRef.value.affects.splice(0, flawRef.value.affects.length);
    removeAffects();

    expect(deleteAffects).toHaveBeenCalledWith(affectsToDelete);
    expect(flawRef.value.affects.length).toBe(0);
  });

  osimFullFlawTest('should save new affects', async ({ flaw }) => {
    vi.mocked(getFlaw).mockResolvedValue(flaw);
    const { flawRef, model } = await useMockedModel(flaw);
    const fakeAffect = mockAffect({ ps_component: 'component1', ps_module: 'module1' });
    flawRef.value.affects.push(fakeAffect);

    vi.mocked(postAffects).mockResolvedValue({ data:
      { results:
      [...flawRef.value.affects, fakeAffect] } });

    expect(model.wereAffectsEditedOrAdded.value).toBe(true);
    await model.saveAffects();
    expect(postAffects).toHaveBeenCalled();
  });
});
