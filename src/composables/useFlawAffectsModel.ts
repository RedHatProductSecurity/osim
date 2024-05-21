import { type Ref, ref, toRef, computed, watch } from 'vue';
import {
  postAffect,
  putAffect,
  deleteAffect,
  putAffectCvssScore,
  postAffectCvssScore,
} from '@/services/AffectService';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodAffectType, ZodFlawType, ZodAffectCVSSType } from '@/types/zodFlaw';
import { deepCopyFromRaw } from '@/utils/helpers';

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  const wereAffectsModified = ref(false);
  const modifiedAffectIds = ref<string[]>([]);
  const affectsToDelete = ref<ZodAffectType[]>([]);
  const theAffects: Ref<ZodAffectType[]> = toRef(flaw.value, 'affects');
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

  function wasCvssModified(uuid: string) {
    const affect = theAffects.value.find((affect) => affect.uuid === uuid);

    if (!affect || !affect.cvss_scores.length || !affectCvssData(affect, 'RH', 'V3')?.vector) {
      return null;
    }

    const originalAffect: Record<string, any> | undefined = initialAffects.find((affect) => affect.uuid === uuid);

    if (!originalAffect || !originalAffect.cvss_scores.length) {
      return true; // affect is has just been added
    }

    return affect.cvss_scores.some((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect.cvss_scores[index]?.[key] !== value
      )
    );
  }

  function modifiedScores(uuid: string) {
    const affect = theAffects.value.find((affect) => affect.uuid === uuid);

    if (!affect || !affect.cvss_scores.length || !affectCvssData(affect, 'RH', 'V3')?.vector) {
      return [];
    }

    const originalAffect: Record<string, any> | undefined = initialAffects.find((affect) => affect.uuid === uuid);

    if (!originalAffect) {
      return affect.cvss_scores.filter(isCvssNew);
    }

    return affect.cvss_scores.filter((cvssScore, index) =>
      Object.entries(cvssScore).some(
        ([key, value]) => originalAffect.cvss_scores[index]?.[key] !== value
      )
    );
  }

  const affectsToSave = computed(() =>
    [
      ...theAffects.value.filter((affect) => affect.uuid && modifiedAffectIds.value.includes(affect.uuid)),
      ...theAffects.value.filter((affect) => !affect.uuid),
    ].filter((affect) => !affectsToDelete.value.includes(affect)),
  );

  const { addToast } = useToastStore();

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
  }

  theAffects.value.forEach((affect) => {
    watch(affect, () => {
      if (affect.uuid) {
        reportAffectAsModified(affect.uuid);
      }
    }, { deep: true });
  });

  async function deleteAffects() {
    for (const affect of affectsToDelete.value) {
      if (affect.uuid){
        await deleteAffect(affect.uuid);
      }
    }
  }

  function reportAffectAsModified(affectId: string) {
    wereAffectsModified.value = true;
    modifiedAffectIds.value.push(affectId);
  }

  async function saveAffects() {
    const affectsToSaveQuantity = affectsToSave.value.length;
    for (let index = 0; index < affectsToSaveQuantity; index++) {
      const affect = affectsToSave.value[index];
      const requestBody = {
        flaw: flaw.value?.uuid,
        type: affect.type,
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

      if (affect?.uuid && wasCvssModified(affect.uuid)) {
        const cvssScores = modifiedScores(affect.uuid);

        for (const cvssScore of cvssScores) {
          console.log(cvssScore);
          if (isCvssNew(cvssScore)) {
            console.log('new');
            await postAffectCvssScore(affect.uuid, cvssScore);
          } else if (cvssScore.uuid) {
            console.log('updatey ');
            await putAffectCvssScore(affect.uuid, cvssScore.uuid, cvssScore);
          }
        }
      }

      addToast({
        title: 'Info',
        body: `Affect ${index + 1} of ${affectsToSaveQuantity} Saved: ${
          requestBody.ps_component
        }`,
      });
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
  };
}
