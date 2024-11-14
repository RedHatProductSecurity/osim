import { ref } from 'vue';

import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { osimFullFlawTest } from '@/components/__tests__/test-suite-helpers';

import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';

import { useFlawAffectsModel } from '../useFlawAffectsModel';

setActivePinia(createTestingPinia());

describe('useFlawAffectsModel', () => {
  osimFullFlawTest('should return the expected values', ({ flaw }) => {
    const model = useFlawAffectsModel(ref(flaw));

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

  osimFullFlawTest('should add an affect', ({ flaw }) => {
    const flawRef = ref({ ...flaw, affects: [] });
    const { addAffect, wereAffectsEditedOrAdded } = useFlawAffectsModel(flawRef);

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
    expect(flawRef.value.affects.length).toBe(1);
  });

  osimFullFlawTest('should remove an affect', ({ flaw }) => {
    const flawRef = ref(flaw);
    const { affectsToDelete, removeAffect } = useFlawAffectsModel(flawRef);

    removeAffect(flawRef.value.affects[0]);

    expect(affectsToDelete.value.length).toBe(1);
  });

  osimFullFlawTest('should update an affect', ({ flaw }) => {
    const flawRef = ref(flaw);
    const { wereAffectsEditedOrAdded } = useFlawAffectsModel(flawRef);

    flawRef.value.affects[0].impact = 'CRITICAL';

    expect(wereAffectsEditedOrAdded.value).toBe(true);
  });

  osimFullFlawTest('should update an affect CVSS', ({ flaw }) => {
    const flawRef = ref(flaw);
    const { updateAffectCvss, wereAffectsEditedOrAdded } = useFlawAffectsModel(flawRef);

    updateAffectCvss(flawRef.value.affects[0], 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 7.8, -1);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
  });

  osimFullFlawTest('should delete an affect CVSS', ({ flaw }) => {
    const flawRef = ref(flaw);
    flawRef.value.affects[0].cvss_scores.push({
      issuer: IssuerEnum.Rh,
      cvss_version: CVSS_V3,
      score: 7.8,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      uuid: '123',
      alerts: [],
    });
    const { affectCvssToDelete, updateAffectCvss, wereAffectsEditedOrAdded } = useFlawAffectsModel(flawRef);

    updateAffectCvss(flawRef.value.affects[0], '', null, 0);

    expect(wereAffectsEditedOrAdded.value).toBe(true);
    expect(affectCvssToDelete.value).toHaveProperty(flawRef.value.affects[0].uuid!);
    expect(affectCvssToDelete.value[flawRef.value.affects[0].uuid!]).toBe('123');
  });
});
