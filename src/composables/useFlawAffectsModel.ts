import { type Ref, ref, toRef, computed, watch } from 'vue';
import {
  postAffect,
  putAffect,
  putAffects,
  deleteAffect,
  putAffectCvssScore,
  postAffectCvssScore,
} from '@/services/AffectService';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodFlawType } from '@/types/zodFlaw';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/zodAffect';
import { deepCopyFromRaw } from '@/utils/helpers';
import { sortWith, ascend, prop, equals } from 'ramda';

const sortAffects = (affects = []) => {
  return sortWith([ascend(prop('ps_module')), ascend(prop('ps_component'))], affects);
};

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  const wereAffectsModified = ref(false);
  const modifiedAffectIds = ref<string[]>([]);
  const affectsToDelete = ref<ZodAffectType[]>([]);
  const theAffects: Ref<ZodAffectType[]> = toRef(sortAffects(flaw.value.affects));
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
    const affect = theAffects.value.find((affect) => affect.uuid === affectUuid);

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
    const affect = theAffects.value.find((affect) => affect.uuid === affectUuid);

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
    theAffects.value.filter((affect) => affect.uuid && modifiedAffectIds.value.includes(affect.uuid)),
  );

  const affectsToCreate = computed(() => theAffects.value.filter((affect) => !affect.uuid));

  const affectsToSave = computed(() =>
    [...affectsToUpdate.value, ...affectsToCreate.value].filter(
      (affect) => !affectsToDelete.value.includes(affect),
    ),
  );

  const { addToast } = useToastStore();

  const resetAffectChanges = () => {
    affectsToDelete.value = [];
    modifiedAffectIds.value = [];
  };

  function addBlankAffect() {
    const embargoed = flaw.value.embargoed;
    theAffects.value.push({
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
      }],
      trackers: [{ errata: [] }],
    } as ZodAffectType);
  }

  function removeAffect(affectIdx: number) {
    const deletedAffect = theAffects.value.splice(affectIdx, 1)[0];
    affectsToDelete.value.push(deletedAffect);
  }

  function recoverAffect(affectIdx: number) {
    const recoveredAffect = affectsToDelete.value.splice(affectIdx, 1)[0];
    theAffects.value.push(recoveredAffect);
    theAffects.value = sortAffects(theAffects.value);
  }

  function hasAffectChanged(affect: ZodAffectType) {
    const originalAffect = initialAffects.find((maybeMatch) => maybeMatch.uuid === affect.uuid);
    return !equals(originalAffect, affect);
  }

  theAffects.value.forEach((affect) => {
    watch(affect, () => {
      if (affect.uuid && hasAffectChanged(affect)) {
        reportAffectAsModified(affect.uuid);
      }
    }, { deep: true });
  });

  async function deleteAffects() {
    for (const affect of affectsToDelete.value) {
      if (affect.uuid) {
        await deleteAffect(affect.uuid);
      }
    }
  }

  function reportAffectAsModified(affectId: string) {
    wereAffectsModified.value = true;
    modifiedAffectIds.value.push(affectId);
  }

  async function saveAffects() {
    if (wereAffectsModified.value) {
      const requestBody = affectsToUpdate.value.map((affect) => ({
        flaw: flaw.value?.uuid,
        uuid: affect.uuid,
        affectedness: affect.affectedness,
        resolution: affect.resolution,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
        impact: affect.impact,
        embargoed: affect.embargoed || false,
        updated_dt: affect.updated_dt,
      }));
      await putAffects(requestBody);
      wereAffectsModified.value = false;
    }
    const affectsToCreateQuantity = affectsToCreate.value.length;
    for (let index = 0; index < affectsToCreateQuantity; index++) {
      const affect = affectsToCreate.value[index];
      const requestBody = {
        flaw: flaw.value?.uuid,
        affectedness: affect.affectedness,
        resolution: affect.resolution,
        delegated_resolution: affect.delegated_resolution,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
        impact: affect.impact,
        embargoed: affect.embargoed || false,
        updated_dt: affect.updated_dt,
      };
      if (affect.uuid != null) {
        try {
          await putAffect(affect.uuid, requestBody);
        } catch (error: unknown) {
          const displayedError = getDisplayedOsidbError(error);
          addToast({
            title: 'Error updating Affect',
            body: displayedError,
            css: 'warning',
          });
          throw error;
        }
      } else {
        await postAffect(requestBody);
      }

      if (affect?.uuid && shouldSaveCvss(affect.uuid)) {
        const cvssScores = cvssScoresToSave(affect.uuid);

        for (const cvssScore of cvssScores) {
          if (isCvssNew(cvssScore)) {
            await postAffectCvssScore(affect.uuid, cvssScore);
          } else if (cvssScore.uuid) {
            await putAffectCvssScore(affect.uuid, cvssScore.uuid, cvssScore);
          }
        }
      }

      // addToast({
      //   title: 'Info',
      //   body: `Affect ${index + 1} of ${affectsToCreateQuantity} Saved: ${
      //     requestBody.ps_component
      //   }`,
      // });
    }
  }

  return {
    addBlankAffect,
    removeAffect,
    recoverAffect,
    saveAffects,
    deleteAffects,
    reportAffectAsModified,
    theAffects,
    wereAffectsModified,
    affectsToDelete,
    affectsToSave,
    resetAffectChanges,
  };
}
