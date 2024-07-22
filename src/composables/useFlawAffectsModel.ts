import { type Ref, ref, computed, watch } from 'vue';
import {
  postAffects,
  putAffects,
  deleteAffects,
  putAffectCvssScore,
  postAffectCvssScore,
} from '@/services/AffectService';
import { getFlaw } from '@/services/FlawService';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodFlawType } from '@/types/zodFlaw';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/zodAffect';
import { deepCopyFromRaw } from '@/utils/helpers';
import { equals, pickBy } from 'ramda';

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  // CVSS modifications are not counted
  const wereAffectsModified = computed(() => affectIdsForPutRequest.value.length > 0);
  const affectsWithChangedCvss = ref<ZodAffectType[]>([]);
  const affectIdsForPutRequest = ref<string[]>([]);
  const affectsToDelete = ref<ZodAffectType[]>([]);
  const initialAffects = deepCopyFromRaw(flaw.value.affects);

  function refreshAffects() {
    return getFlaw(flaw.value.uuid).then((response) => {
      console.log('refreshing affects');
      flaw.value.affects = response.affects;
    });
  }

  function isCvssNew(cvssScore: ZodAffectCVSSType) {
    if (
      (cvssScore.uuid && !cvssScore.affect)
      || (!cvssScore.uuid && cvssScore.affect)
    ) {
      console.error('CVSS score is missing either uuid or affect', cvssScore);
    }
    return !cvssScore.uuid && !cvssScore.affect;
  }

  function affectCvssData(affect: ZodAffectType, issuer: string, version: string) {
    return affect.cvss_scores.find(
      (assessment) => assessment.issuer === issuer && assessment.cvss_version === version
    );
  }

  function affectsMatcherFor(affect: ZodAffectType) {
    return (affectToMatch: ZodAffectType) =>
      affectToMatch.uuid === affect.uuid
      || (
        (affect.ps_component && affectToMatch.ps_component === affect.ps_component)
        && (affect.ps_component && affectToMatch.ps_module === affect.ps_module)
      );
  }

  function hasAffectCvssChanged(anAffect: ZodAffectType) {

    const matchAffectTo = affectsMatcherFor(anAffect);
    const affect = flaw.value.affects.find(matchAffectTo);

    if ( // affect is new and has cvss scores
      affect && !affect.uuid && affect.cvss_scores.length && affectCvssData(affect, 'RH', 'V3')?.vector
    ) {
      return true;
    }

    if ( // affect has no relevant cvss scores to check
      !affect || !affect.cvss_scores.length || !affectCvssData(affect, 'RH', 'V3')?.vector
    ) {
      return false;
    }

    // Check affect's CVSS data to see if at least one cvss score has been modified
    const originalAffect: Record<string, any> | undefined = initialAffects.find(matchAffectTo);
    return affect.cvss_scores.some((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect && originalAffect.cvss_scores[index]?.[key] !== value
      )
    );  // affect has been modified
  }

  function cvssScoresToSave(anAffect: ZodAffectType) {

    const matchAffectTo = affectsMatcherFor(anAffect);
    const affect = flaw.value.affects.find(matchAffectTo);

    const originalAffect: Record<string, any> | undefined = initialAffects.find(
      (affect) => affect.uuid === anAffect.uuid
      || matchAffectTo(affect)
    );

    if (!affect || !affect.cvss_scores.length || !affectCvssData(affect, 'RH', 'V3')?.vector) {
      return [];
    }

    if (!originalAffect) {
      return affect.cvss_scores.filter(isCvssNew);
    }

    return affect.cvss_scores.filter((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect.cvss_scores[index]?.[key] !== value
      )
    );
  }

  const affectsToUpdate = computed(() =>
    flaw.value.affects.filter((affect) => affect.uuid && affectIdsForPutRequest.value.includes(affect.uuid)),
  );

  const affectsToCreate = computed(() => flaw.value.affects.filter((affect) => !affect.uuid));

  const didAffectsChange = computed(() => {
    const affectsForMainEndpoint = [...affectsToUpdate.value, ...affectsToCreate.value]
      .filter(
        (affect) => !affectsToDelete.value.includes(affect),
      );
    return affectsForMainEndpoint.length > 0 || affectsWithChangedCvss.value.length > 0;
  });

  const { addToast } = useToastStore();

  function resetModifiedAffects() {
    affectIdsForPutRequest.value = [];
  }

  function resetAffectCvssChanges() {
    affectsWithChangedCvss.value = [];
  }

  function resetAffectsForDeletion() {
    affectsToDelete.value = [];
  }

  function addBlankAffect() {
    const embargoed = flaw.value.embargoed;
    flaw.value.affects.push({
      embargoed,
      affectedness: '',
      resolution: '',
      delegated_resolution: '', // should this be null
      ps_module: '',
      ps_component: '',
      impact: '',
      cvss_scores: [{
        // affect: z.string().uuid(),
        cvss_version: 'V3',
        issuer: 'RH',
        comment: '',
        score: null,
        vector: '',
        embargoed,
        alerts: [],
      }],
      trackers: [{ errata: [] }],
      alerts: [],
    } as ZodAffectType);
  }

  function removeAffect(affectIdx: number) {
    const deletedAffect = flaw.value.affects.splice(affectIdx, 1)[0];
    affectsToDelete.value.push(deletedAffect);
  }

  function recoverAffect(affectIdx: number) {
    const recoveredAffect = affectsToDelete.value.splice(affectIdx, 1)[0];
    flaw.value.affects.push(recoveredAffect);
  }

  function doesAffectHaveChangedValues(affect: ZodAffectType) {
    const originalAffect = initialAffects.find((maybeMatch) => maybeMatch.uuid === affect.uuid);

    // Changes to CVSS scores are tracked separately
    const excludingCvssScores = pickBy((_, key) => key !== 'cvss_scores');
    return !equals(
      excludingCvssScores(originalAffect), excludingCvssScores(affect)
    );
  }

  function trackAffectChange(affect: ZodAffectType) {

    if (affect.uuid && doesAffectHaveChangedValues(affect)) {
      affectIdsForPutRequest.value.push(affect.uuid);
    } else {
      // if tracked, remove affect if it has reverted to original state
      affectIdsForPutRequest.value = affectIdsForPutRequest.value.filter((id) => id !== affect.uuid);
    }

    if (hasAffectCvssChanged(affect) && !affectsWithChangedCvss.value.includes(affect)) {
      affectsWithChangedCvss.value.push(affect);
    } else {
      affectsWithChangedCvss.value = affectsWithChangedCvss.value.filter((affectToMatch) => affectToMatch !== affect);
    }
  }

  let watchers: (() => void)[] = [];
  watch(flaw.value.affects, (affects) => {
    watchers.forEach((unwatch: () => void) => unwatch());
    watchers = affects.map((affect) => watch(affect, trackAffectChange, { deep: true }));
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
        console.error('Error occurred while creating affect(s):', error);
      }
    }

    if (wereAffectsModified.value) {
      try {
        const response: any = await putAffects(affectsToUpdate.value.map(requestBodyFromAffect));
        savedAffects.push(...response.data.results);
        resetModifiedAffects();
      } catch (error) {
        console.error('Error occurred while updating affect(s):', error);
      }
    }

    if (affectsWithChangedCvss.value.length) {

      let cvssScoresSavedCount = 0;
      let affectWithChangedCvssCount = 0;

      for (const affect of affectsWithChangedCvss.value) {

        if (!affect.uuid) {

          const savedAffect = savedAffects.find(affectsMatcherFor(affect));

          if (!savedAffect) {
            console.error('Could not find saved affect for:', affect);
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
              (affectToMatch) => affectToMatch !== affect
            );
          }
          ++affectWithChangedCvssCount;
          resetAffectCvssChanges();
        } catch (error) {
          console.error('Error following affect save:', error);
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
  }

  return {
    addBlankAffect,
    removeAffect,
    recoverAffect,
    saveAffects,
    removeAffects,
    wereAffectsModified,
    affectsToDelete,
    didAffectsChange,
    initialAffects,
    refreshAffects,
  };
}
