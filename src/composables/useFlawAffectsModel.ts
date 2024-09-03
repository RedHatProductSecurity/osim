import { type Ref, ref, computed, watch } from 'vue';

import { equals, pickBy } from 'ramda';

import { affectRhCvss3, deepCopyFromRaw, isScoreRhIssuedCvss3, affectsMatcherFor } from '@/utils/helpers';
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
import type { ZodFlawType } from '@/types/zodFlaw';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/zodAffect';

const affectsWithChangedCvss = ref<ZodAffectType[]>([]);
const affectIdsForPutRequest = ref<string[]>([]);
const affectsToDelete = ref<ZodAffectType[]>([]);
const affectCvssToDelete = ref<Record<string, string>>({});

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  // CVSS modifications are not counted
  const wereAffectsModified = computed(() => affectIdsForPutRequest.value.length > 0);
  const initialAffects = deepCopyFromRaw(flaw.value.affects);

  function refreshAffects() {
    return getFlaw(flaw.value.uuid).then((response) => {
      flaw.value.affects = response.affects;
    });
  }

  function hasAffectCvssChanged(anAffect: ZodAffectType) {
    const matchAffectTo = affectsMatcherFor(anAffect);
    const affect = flaw.value.affects.find(matchAffectTo);

    if ( // affect is new and has cvss scores
      affect && !affect.uuid && affect.cvss_scores.length && affectRhCvss3(affect)?.vector
    ) {
      return true;
    }

    if ( // affect has no relevant cvss scores to check
      !affect || !affect.cvss_scores.length || !affectRhCvss3(affect)?.vector
    ) {
      return false;
    }

    // Check affect's CVSS data to see if at least one cvss score has been modified
    const originalAffect: Record<string, any> | undefined = initialAffects.find(matchAffectTo);
    return affect.cvss_scores.some((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect && originalAffect.cvss_scores[index]?.[key] !== value,
      ),
    );  // affect has been modified
  }

  function cvssScoresToSave(anAffect: ZodAffectType) {
    const matchAffectTo = affectsMatcherFor(anAffect);
    const affect = flaw.value.affects.find(matchAffectTo);

    const originalAffect: Record<string, any> | undefined = initialAffects.find(
      affect => affect.uuid === anAffect.uuid
      || matchAffectTo(affect),
    );

    if (!affect || !affect.cvss_scores.length || !affectRhCvss3(affect)?.vector) {
      return [];
    }

    if (!originalAffect) {
      return affect.cvss_scores.filter(isCvssNew);
    }

    return affect.cvss_scores.filter((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect.cvss_scores[index]?.[key] !== value,
      ),
    );
  }

  const affectsToUpdate = computed(() =>
    flaw.value.affects.filter(affect => affect.uuid && affectIdsForPutRequest.value.includes(affect.uuid)),
  );

  const affectsToCreate = computed(() => flaw.value.affects.filter(affect => !affect.uuid));

  const didAffectsChange = computed(() => {
    const affectsForMainEndpoint = [...affectsToUpdate.value, ...affectsToCreate.value]
      .filter(
        affect => !affectsToDelete.value.includes(affect),
      );
    return affectsForMainEndpoint.length > 0
      || affectsWithChangedCvss.value.length > 0
      || Object.keys(affectCvssToDelete.value).length > 0;
  });

  const { addToast } = useToastStore();

  function resetAffectsForDeletion() {
    affectsToDelete.value = [];
  }

  function addAffect(newAffect: ZodAffectType) {
    newAffect.embargoed = flaw.value.embargoed;
    flaw.value.affects.unshift(newAffect);
  }

  function removeAffect(affect: ZodAffectType, isRecoverable = true) {
    const affectIndex = flaw.value.affects.findIndex(affectToMatch => affectToMatch === affect);
    console.log('affectIndex', affectIndex);
    if (affectIndex === -1) return;
    const deletedAffect = flaw.value.affects.splice(affectIndex, 1)[0];
    if (isRecoverable) affectsToDelete.value.push(deletedAffect);
  }

  function recoverAffect(affect: ZodAffectType) {
    const affectIndex = affectsToDelete.value.findIndex(affectToMatch => affectToMatch === affect);
    if (affectIndex === -1) return;
    const recoveredAffect = affectsToDelete.value.splice(affectIndex, 1)[0];
    flaw.value.affects.push(recoveredAffect);
  }

  function doesAffectHaveChangedValues(affect: ZodAffectType) {
    const originalAffect = initialAffects.find(maybeMatch => maybeMatch.uuid === affect.uuid);

    // Changes to CVSS scores are tracked separately
    const excludingCvssScores = pickBy((_, key) => key !== 'cvss_scores');
    return !equals(
      excludingCvssScores(originalAffect), excludingCvssScores(affect),
    );
  }

  function trackAffectChange(affect: ZodAffectType) {
    if (affect.uuid && doesAffectHaveChangedValues(affect)) {
      affectIdsForPutRequest.value.push(affect.uuid);
    } else {
      // if tracked, remove affect if it has reverted to original state
      affectIdsForPutRequest.value = affectIdsForPutRequest.value.filter(id => id !== affect.uuid);
    }

    if (hasAffectCvssChanged(affect) && !affectsWithChangedCvss.value.includes(affect)) {
      affectsWithChangedCvss.value.push(affect);
    } else {
      affectsWithChangedCvss.value = affectsWithChangedCvss.value.filter(affectToMatch => affectToMatch !== affect);
    }
  }

  let watchers: (() => void)[] = [];
  watch(flaw.value.affects, (affects) => {
    watchers.forEach((unwatch: () => void) => unwatch());
    watchers = affects.map(affect => watch(affect, trackAffectChange, { deep: true }));
  }, { immediate: true, deep: false });

  async function removeAffects() {
    await deleteAffects(affectsToDelete.value.map(({ uuid }) => uuid as string).filter(Boolean));
    resetAffectsForDeletion();
  }

  async function saveAffects() {
    const savedAffects: ZodAffectType[] = [];
    const requestBodyFromAffect = (affect: ZodAffectType) => ({
      flaw: flaw.value?.uuid,
      uuid: affect.uuid,
      affectedness: affect.affectedness,
      resolution: affect.resolution,
      delegated_resolution: affect.delegated_resolution,
      ps_module: affect.ps_module,
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
        console.error('useFlawAffectsModel::saveAffects() Error occurred while creating affect(s):', error);
      }
    }

    if (wereAffectsModified.value) {
      try {
        const response: any = await putAffects(affectsToUpdate.value.map(requestBodyFromAffect));
        savedAffects.push(...response.data.results);
        resetModifiedAffects();
      } catch (error) {
        console.error('useFlawAffectsModel::saveAffects() Error occurred while updating affect(s):', error);
      }
    }

    if (affectsWithChangedCvss.value.length) {
      let cvssScoresSavedCount = 0;
      let affectWithChangedCvssCount = 0;

      for (const affect of affectsWithChangedCvss.value) {
        if (!affect.uuid) {
          const savedAffect = savedAffects.find(affectsMatcherFor(affect));

          if (!savedAffect) {
            console.error('useFlawAffectsModel::saveAffects() Could not find saved affect for:', affect);
            continue;
          }

          affect.uuid = savedAffect.uuid;
        }

        const cvssScores = cvssScoresToSave(affect);

        try {
          for (const cvssScore of cvssScores) {
            if (isCvssNew(cvssScore)) {
              await postAffectCvssScore(affect.uuid as string, cvssScore);
              ++cvssScoresSavedCount;
            } else if (cvssScore.uuid) {
              await putAffectCvssScore(affect.uuid as string, cvssScore.uuid, cvssScore);
              ++cvssScoresSavedCount;
            }
            affectsWithChangedCvss.value = affectsWithChangedCvss.value.filter(
              affectToMatch => affectToMatch !== affect,
            );
          }
          ++affectWithChangedCvssCount;
          resetAffectCvssChanges();
        } catch (error) {
          console.error('useFlawAffectsModel::saveAffects() Error updating CVSS score(s):', error);
        }
      }

      if (cvssScoresSavedCount) {
        addToast({
          title: 'Success!',
          body: `${cvssScoresSavedCount} CVSS score(s) saved on ${affectWithChangedCvssCount} affect(s).`,
          css: 'success',
        });
      }
    }

    if (Object.keys(affectCvssToDelete.value).length > 0) {
      let cvssScoresRemovedCount = 0;
      let affectWithRemovedCvssCount = 0;
      const cvssScoresToDelete = [];
      try {
        for (const affectId of Object.keys(affectCvssToDelete.value)) {
          const affect = flaw.value.affects.find(affect => affect.uuid === affectId);
          if (affect) {
            const cvssId = affectCvssToDelete.value[affectId];
            if (cvssId) {
              cvssScoresToDelete.push(deleteAffectCvssScore(affect.uuid as string, cvssId));
              cvssScoresRemovedCount++;
            }
          }
        }
        cvssScoresRemovedCount = (await Promise.allSettled(cvssScoresToDelete))
          .filter(({ status }) => status === 'fulfilled').length;
        affectWithRemovedCvssCount++;
      } catch (error) {
        console.error('useFlawAffectsModel::saveAffects() Error removing CVSS score(s):', error);
      }

      if (cvssScoresRemovedCount) {
        addToast({
          title: 'Success!',
          body: `${cvssScoresRemovedCount} CVSS score(s) removed on ${affectWithRemovedCvssCount} affect(s).`,
          css: 'success',
        });
      }
    }
  }

  function updateAffectCvss(affect: ZodAffectType, newValue: string) {
    const cvssScoreIndex = affect.cvss_scores.findIndex(isScoreRhIssuedCvss3);
    const cvssId = affect.cvss_scores[cvssScoreIndex]?.uuid;
    if (newValue === '' && cvssScoreIndex !== -1 && affect.uuid && cvssId) {
      affect.cvss_scores[cvssScoreIndex].vector = '';
      affectCvssToDelete.value[affect.uuid] = cvssId;
    } else {
      if (affect.uuid && affectCvssToDelete.value[affect.uuid]) {
        delete affectCvssToDelete.value[affect.uuid];
      }
      if (cvssScoreIndex !== -1) {
        affect.cvss_scores[cvssScoreIndex].vector = newValue;
      } else if (newValue !== '') {
        affect.cvss_scores.push({
          issuer: 'RH',
          cvss_version: 'V3',
          comment: '',
          score: null,
          vector: newValue,
          embargoed: affect.embargoed,
          alerts: [],
        });
      }
    }
  }

  return {
    addAffect,
    removeAffect,
    recoverAffect,
    saveAffects,
    removeAffects,
    wereAffectsModified,
    affectsToDelete,
    affectCvssToDelete,
    didAffectsChange,
    initialAffects,
    refreshAffects,
    updateAffectCvss,
  };
}

function isCvssNew(cvssScore: ZodAffectCVSSType) {
  if (
    (cvssScore.uuid && !cvssScore.affect)
    || (!cvssScore.uuid && cvssScore.affect)
  ) {
    console.error('useFlawAffectsModel::isCvssNew() CVSS score is missing either uuid or affect', cvssScore);
  }
  return !cvssScore.uuid && !cvssScore.affect;
}

function resetModifiedAffects() {
  affectIdsForPutRequest.value = [];
}

function resetAffectCvssChanges() {
  affectsWithChangedCvss.value = [];
}
