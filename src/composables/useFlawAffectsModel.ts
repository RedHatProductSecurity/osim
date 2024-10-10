import { type Ref, ref, computed } from 'vue';

import { equals, pickBy } from 'ramda';

import { affectRhCvss3, deepCopyFromRaw, affectsMatcherFor } from '@/utils/helpers';
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
import type { ZodAffectType, ZodFlawType } from '@/types';

const initialAffects = ref<ZodAffectType[]>([]);

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  const affectsToDelete = computed(() => initialAffects.value.filter(
    initialAffect => !flaw.value.affects.find(affectsMatcherFor(initialAffect)),
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

  const affectCvssToUpsert = computed(() => flaw.value.affects.filter(shouldUpsertAffectCvss));

  const affectsToCreate = computed(() => flaw.value.affects.filter(affect => !affect.uuid));

  const modifiedAffects = computed(() => [
    ...affectsToUpdate.value,
    ...affectCvssToUpsert.value.filter(({ uuid }) => uuid),
  ]);

  const wereAffectsEditedOrAdded = computed(() => modifiedAffects.value.length > 0 || affectsToCreate.value.length > 0);

  const { addToast } = useToastStore();

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
    const affectToRecover = initialAffects.value.find(affectsMatcherFor(affect));
    if (!affectToRecover) return; // Affect is new and has no initial state to recover
    flaw.value.affects.push(affectToRecover);
  }

  function didAffectChange(affect: ZodAffectType, shouldExcludeCvss = false, shouldExcludeNew = true) {
    const originalAffect = initialAffects.value.find(maybeMatch => maybeMatch.uuid === affect.uuid);

    if (!originalAffect && shouldExcludeNew) return false;

    return !areAffectsEqual(affect, originalAffect, shouldExcludeCvss);
  }

  function shouldUpdateAffect(affect: ZodAffectType) {
    return affect.uuid && didAffectChange(affect, true);
  }

  function shouldUpsertAffectCvss(affect: ZodAffectType) {
    return affectRhCvss3(affect)?.vector && didAffectChange(affect, false, false);
  }

  async function removeAffects() {
    await deleteAffects(affectsToDelete.value.map(({ uuid }) => uuid as string));
    resetInitialAffects();
  }

  async function saveAffects() {
    const savedAffects: ZodAffectType[] = [];
    const saveErrors: unknown[] = [];
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

    if (affectCvssToUpsert.value.length) {
      let cvssScoresSavedCount = 0;
      for (const affect of affectCvssToUpsert.value) {
        // For any new affects that have just been saved, we need to update the affect's
        if (!affect.uuid) {
          const savedAffect = savedAffects.find(affectsMatcherFor(affect));

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
    affectsToDelete,
    affectCvssToDelete,
    initialAffects,
    refreshAffects,
    modifiedAffects,
    wereAffectsEditedOrAdded,
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
