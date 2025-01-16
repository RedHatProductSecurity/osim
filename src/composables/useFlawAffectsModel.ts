import { ref, computed } from 'vue';

import { equals, pickBy } from 'ramda';

import { useFlaw } from '@/composables/useFlaw';

import { affectRhCvss3, deepCopyFromRaw, matcherForAffect } from '@/utils/helpers';
import {
  postAffects,
  putAffects,
  deleteAffects,
  putAffectCvssScore,
  postAffectCvssScore,
  deleteAffectCvssScore,
} from '@/services/AffectService';
import { getFlaw } from '@/services/FlawService';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types';
import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';

const initialAffects = ref<ZodAffectType[]>([]);

export function useFlawAffectsModel() {
  const { flaw } = useFlaw();
  const affectsToDelete = computed(() => initialAffects.value.filter(
    initialAffect => !flaw.value.affects.find(matcherForAffect(initialAffect)),
  ));

  const affectCvssToDelete = computed(() => flaw.value.affects.reduce((mappings, affect) => {
    const rhCvss3 = affectRhCvss3(affect);
    if (affect.uuid && rhCvss3?.uuid && rhCvss3?.vector === '') {
      mappings[affect.uuid] = rhCvss3.uuid;
    }
    return mappings;
  }, {} as Record<string, string>));

  if (!initialAffects.value.length) {
    initialAffects.value = deepCopyFromRaw(flaw.value.affects);
  }

  function refreshAffects() {
    return getFlaw(flaw.value.uuid).then((response) => {
      flaw.value.affects = [...response.affects];
      initialAffects.value = [...response.affects];
    });
  }

  const affectsToUpdate = computed(() => flaw.value.affects.filter(shouldUpdateAffect));

  const affectCvssToSave = computed(() => flaw.value.affects.filter(shouldUpsertAffectCvss));

  const affectsToCreate = computed(() => flaw.value.affects.filter(affect => !affect.uuid));

  const modifiedAffects = computed(() => [
    ...affectsToUpdate.value,
    ...affectCvssToSave.value.filter(({ uuid }) => uuid),
    ...Object.keys(affectCvssToDelete.value)
      .flatMap(affectId => flaw.value.affects.filter(({ uuid }) => uuid === affectId)),
  ]);

  const wereAffectsEditedOrAdded = computed(() => modifiedAffects.value.length > 0 || affectsToCreate.value.length > 0);

  function isAffectBeingRemoved(affect: ZodAffectType) {
    return affectsToDelete.value.some(matcherForAffect(affect));
  }

  function addAffect(newAffect: ZodAffectType) {
    newAffect.embargoed = flaw.value.embargoed;
    flaw.value.affects.unshift(newAffect);
  }

  function removeAffect(affect: ZodAffectType) {
    const affectIndex = flaw.value.affects.findIndex(affectToMatch => affectToMatch === affect);
    if (affectIndex === -1) {
      console.error('useFlawAffectsModel::removeAffect() Could not find affect to remove:', affect);
      return;
    }
    flaw.value.affects.splice(affectIndex, 1);
  }

  function recoverAffect(affect: ZodAffectType) {
    const affectToRecover = initialAffects.value.find(matcherForAffect(affect));
    if (!affectToRecover) return; // Affect is new and has no initial state to recover
    flaw.value.affects.push(affectToRecover);
  }

  function didAffectChange(affect: ZodAffectType, shouldExcludeCvss = false, shouldExcludeNew = true) {
    const originalAffect = initialAffects.value.find(maybeMatch => maybeMatch.uuid === affect.uuid);

    if (!originalAffect && shouldExcludeNew) return false;

    return !areAffectsEqual(affect, originalAffect, shouldExcludeCvss);
  }

  function didAffectCvssChange(affect: ZodAffectType, shouldExcludeNew = true) {
    const originalAffect = initialAffects.value.find(maybeMatch => maybeMatch.uuid === affect.uuid);

    if (!originalAffect && shouldExcludeNew) return false;

    return !areAffectsCvssEqual(
      affectRhCvss3(affect) as ZodAffectCVSSType,
      affectRhCvss3(originalAffect as ZodAffectType) as ZodAffectCVSSType,
    );
  }

  function shouldUpdateAffect(affect: ZodAffectType) {
    return affect.uuid && didAffectChange(affect, true);
  }

  function shouldUpsertAffectCvss(affect: ZodAffectType) {
    return affectRhCvss3(affect)?.vector && (didAffectCvssChange(affect) || !affect.uuid);
  }

  async function removeAffects() {
    await deleteAffects(affectsToDelete.value.map(({ uuid }) => uuid as string));
    resetInitialAffects();
  }

  function updateAffectCvss(
    affect: ZodAffectType, newVector: string, newScore: null | number, cvssScoreIndex: number,
  ) {
    const cvssId = affect.cvss_scores[cvssScoreIndex]?.uuid;
    // Handle affect CVSS removal when saving an empty value
    if (newVector === '' && cvssScoreIndex !== -1 && affect.uuid && cvssId) {
      affect.cvss_scores[cvssScoreIndex].vector = '';
      affect.cvss_scores[cvssScoreIndex].score = null;
      affectCvssToDelete.value[affect.uuid] = cvssId;
      return;
    }
    // Remove CVSS from deletion array when saving a non empty value
    if (affect.uuid && affectCvssToDelete.value[affect.uuid]) {
      delete affectCvssToDelete.value[affect.uuid];
    }
    // Handle saving new CVSS value
    if (cvssScoreIndex !== -1) {
      affect.cvss_scores[cvssScoreIndex].vector = newVector;
      affect.cvss_scores[cvssScoreIndex].score = newScore;
    // Handle updating existing CVSS value
    } else if (newVector !== '') {
      affect.cvss_scores.push({
        issuer: IssuerEnum.Rh,
        cvss_version: CVSS_V3,
        comment: '',
        score: newScore,
        vector: newVector,
        embargoed: affect.embargoed,
        alerts: [],
      });
    }
  }

  async function saveAffects() {
    const { addToast } = useToastStore();

    const savedAffects: ZodAffectType[] = [];
    const saveErrors: unknown[] = [];
    const requestBodyFromAffect = (affect: ZodAffectType) => ({
      flaw: flaw.value?.uuid,
      uuid: affect.uuid,
      affectedness: affect.affectedness,
      resolution: affect.resolution,
      delegated_resolution: affect.delegated_resolution,
      ps_module: affect.ps_module,
      purl: affect.purl,
      ps_component: affect.ps_component,
      impact: affect.impact,
      embargoed: affect.embargoed || false,
      updated_dt: affect.updated_dt,
    });

    if (affectsToCreate.value.length) {
      try {
        const response: any = await postAffects(affectsToCreate.value.map(requestBodyFromAffect));
        savedAffects.push(...response.data.results);
      } catch (error) {
        saveErrors.push(error);
        console.error('useFlawAffectsModel::saveAffects() Error occurred while creating affect(s):', error);
      }
    }

    if (affectsToUpdate.value.length) {
      try {
        const response: any = await putAffects(affectsToUpdate.value.map(requestBodyFromAffect));
        savedAffects.push(...response.data.results);
      } catch (error) {
        saveErrors.push(error);
        console.error('useFlawAffectsModel::saveAffects() Error occurred while updating affect(s):', error);
      }
    }

    if (affectCvssToSave.value.length) {
      let cvssScoresSavedCount = 0;
      for (const affect of affectCvssToSave.value) {
        // For any new affects that have just been saved, we need to update the affect's uuid

        if (!affect.uuid) {
          const savedAffect = savedAffects.find(matcherForAffect(affect));

          if (!savedAffect) {
            const affectIdentifier = `{affect.ps_module}/${affect.ps_component}`;
            const error = `useFlawAffectsModel::saveAffects() Could not find saved affect for: ${affectIdentifier}`;
            console.error(error);
            saveErrors.push(error);
            continue;
          }

          affect.uuid = savedAffect.uuid;
        }

        const cvssScore = affectRhCvss3(affect);

        try {
          if (cvssScore && !cvssScore.uuid) {
            await postAffectCvssScore(affect.uuid as string, cvssScore);
            ++cvssScoresSavedCount;
          } else if (cvssScore?.uuid) {
            await putAffectCvssScore(affect.uuid as string, cvssScore.uuid, cvssScore);
            ++cvssScoresSavedCount;
          }
        } catch (error) {
          saveErrors.push(error);
          console.error('useFlawAffectsModel::saveAffects() Error updating CVSS score(s):', error);
        }
      }

      if (cvssScoresSavedCount) {
        addToast({
          title: 'Success!',
          body: `${cvssScoresSavedCount} CVSS score(s) saved on ${cvssScoresSavedCount} affect(s).`,
          css: 'success',
        });
      }
    }

    if (Object.keys(affectCvssToDelete.value).length > 0) {
      let cvssScoresRemovedCount = 0;
      let affectWithRemovedCvssCount = 0;
      const deletionQueue = [];
      try {
        for (const [affectId, cvssId] of Object.entries(affectCvssToDelete.value)) {
          deletionQueue.push(deleteAffectCvssScore(affectId, cvssId));
          cvssScoresRemovedCount++;
        }
        cvssScoresRemovedCount = (await Promise.allSettled(deletionQueue))
          .filter(({ status }) => status === 'fulfilled').length;
        affectWithRemovedCvssCount++;
      } catch (error) {
        console.error('useFlawAffectsModel::saveAffects() Error removing CVSS score(s):', error);
        saveErrors.push(error);
      }

      if (cvssScoresRemovedCount) {
        addToast({
          title: 'Success!',
          body: `${cvssScoresRemovedCount} CVSS score(s) removed on ${affectWithRemovedCvssCount} affect(s).`,
          css: 'success',
        });
      }
    }
    if (saveErrors.length === 0) {
      refreshAffects();
    }
  }

  return {
    addAffect,
    removeAffect,
    recoverAffect,
    saveAffects,
    removeAffects,
    updateAffectCvss,
    affectsToDelete,
    affectCvssToDelete,
    initialAffects,
    refreshAffects,
    modifiedAffects,
    wereAffectsEditedOrAdded,
    isAffectBeingRemoved,
  };
}

export function resetInitialAffects() {
  initialAffects.value = [];
}

function areAffectsEqual(affect: ZodAffectType, otherAffect?: ZodAffectType, shouldExcludeCvss = false) {
  if (!otherAffect) return false;
  const fieldsToExclude = shouldExcludeCvss ? ['trackers', 'cvss_scores'] : ['trackers'];
  const excludeFields = pickBy((_, key) => !fieldsToExclude.includes(key));
  return equals(excludeFields(affect), excludeFields(otherAffect));
}

function areAffectsCvssEqual(affectCvss: ZodAffectCVSSType, otherAffectCvss: ZodAffectCVSSType) {
  return equals(affectCvss, otherAffectCvss);
}
