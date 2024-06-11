import { type Ref, ref, computed, watch, toRaw } from 'vue';
import {
  postAffects,
  putAffects,
  deleteAffects,
  putAffectCvssScore,
  postAffectCvssScore,
} from '@/services/AffectService';
// import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodFlawType } from '@/types/zodFlaw';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/zodAffect';
import { deepCopyFromRaw } from '@/utils/helpers';
import { equals } from 'ramda';

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  const wereAffectsModified = computed(() => modifiedAffectIds.value.length > 0);
  const modifiedAffectIds = ref<string[]>([]);
  const affectsToDelete = ref<ZodAffectType[]>([]);
  const initialAffects = deepCopyFromRaw(flaw.value.affects);

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

  function shouldSaveCvss(affectUuid: string) {
    const affect = flaw.value.affects.find((affect) => affect.uuid === affectUuid);

    if (!affect || !affect.cvss_scores.length || !affectCvssData(affect, 'RH', 'V3')?.vector) {
      return null;
    }

    const originalAffect: Record<string, any> | undefined = initialAffects.find((affect) => affect.uuid === affectUuid);

    if (!originalAffect || !originalAffect.cvss_scores.length) {
      return true; // affect is has just been added
    }

    return affect.cvss_scores.some((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect.cvss_scores[index]?.[key] !== value
      )
    );
  }

  function cvssScoresToSave(affectUuid: string) {
    const affect = flaw.value.affects.find((affect) => affect.uuid === affectUuid);

    if (!affect || !affect.cvss_scores.length || !affectCvssData(affect, 'RH', 'V3')?.vector) {
      return [];
    }

    const originalAffect: Record<string, any> | undefined = initialAffects.find((affect) => affect.uuid === affectUuid);

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
    flaw.value.affects.filter((affect) => affect.uuid && modifiedAffectIds.value.includes(affect.uuid)),
  );

  const affectsToCreate = computed(() => flaw.value.affects.filter((affect) => !affect.uuid));

  const affectsToSave = computed(() =>
    [...affectsToUpdate.value, ...affectsToCreate.value].filter(
      (affect) => !affectsToDelete.value.includes(affect),
    ),
  );

  const { addToast } = useToastStore();

  function resetModifiedAffects() {
    modifiedAffectIds.value = [];
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
    return !equals(originalAffect, affect);
  }

  function trackAffectChange(affect: ZodAffectType) {
    if (!affect.uuid) {
      return;
    }
    if (doesAffectHaveChangedValues(affect)) {
      modifiedAffectIds.value.push(affect.uuid);
    } else {
      // remove affect if it has reverted to original state
      modifiedAffectIds.value = modifiedAffectIds.value.filter((id) => id !== affect.uuid);
    }
  }

  flaw.value.affects.forEach((affect) => watch(affect, trackAffectChange, { deep: true }));

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

    if (wereAffectsModified.value) {
      const requestBody = affectsToUpdate.value.map(requestBodyFromAffect);
      await putAffects(requestBody);
      savedAffects.push(...affectsToUpdate.value);
      resetModifiedAffects();
    }

    if (affectsToCreate.value.length) {
      await postAffects(affectsToCreate.value.map(requestBodyFromAffect));
      savedAffects.push(...affectsToUpdate.value);
    }

    const affectCvssScoresToSave = savedAffects.filter((affect) => shouldSaveCvss(affect.uuid as string));
    if (affectCvssScoresToSave.length) {
      for (const affect of affectCvssScoresToSave) {
        if (!affect.uuid) {
          console.error('Error following affect save: Saved affect is missing uuid', affect);
          console.error('Data from response of affect saved has unexpected content.');
          continue;
        }

        const cvssScores = cvssScoresToSave(affect.uuid);
        for (const cvssScore of cvssScores) {
          if (isCvssNew(cvssScore)) {
            await postAffectCvssScore(affect.uuid, cvssScore);
          } else if (cvssScore.uuid) {
            await putAffectCvssScore(affect.uuid, cvssScore.uuid, cvssScore);
          }
        }
      }
    }
    addToast({
      title: 'Success!',
      body: 'Affects CVSS scores saved.',
    });
  }

  return {
    addBlankAffect,
    removeAffect,
    recoverAffect,
    saveAffects,
    removeAffects,
    wereAffectsModified,
    affectsToDelete,
    affectsToSave,
  };
}

