import { type Ref, ref, toRef, computed, watch } from 'vue';
import { postAffect, putAffect, putAffects, deleteAffect } from '@/services/AffectService';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodAffectType, ZodFlawType } from '@/types/zodFlaw';

export function useFlawAffectsModel(flaw: Ref<ZodFlawType>) {
  const wereAffectsModified = ref(false);
  const modifiedAffectIds = ref<string[]>([]);
  const affectsToDelete = ref<ZodAffectType[]>([]);
  const theAffects: Ref<ZodAffectType[]> = toRef(flaw.value, 'affects');

  const affectsToUpdate = computed(() =>
    theAffects.value.filter((affect) => modifiedAffectIds.value.includes(affect.uuid)),
  );

  const affectsToCreate = computed(() => theAffects.value.filter((affect) => !affect.uuid));

  const affectsToSave = computed(() =>
    [...affectsToUpdate.value, ...affectsToCreate.value].filter(
      (affect) => !affectsToDelete.value.includes(affect),
    ),
  );

  const { addToast } = useToastStore();

  function addBlankAffect() {
    theAffects.value.push({} as ZodAffectType);
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
      reportAffectAsModified(affect.uuid);
    });
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
    const affectsToCreateQuantity = affectsToCreate.value.length;
    for (let index = 0; index < affectsToCreateQuantity; index++) {
      const affect = affectsToCreate.value[index];
      const requestBody = {
        flaw: flaw.value?.uuid,
        type: affect.type,
        affectedness: affect.affectedness,
        resolution: affect.resolution,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
        impact: affect.impact,
        embargoed: affect.embargoed || false,
        updated_dt: affect.updated_dt,
      };
      await postAffect(requestBody)
        .then(() => {
          console.log("saved newAffect", requestBody);
          addToast({
            title: "Info",
            body: `Affect ${index + 1} of ${affectsToCreateQuantity} Saved: ${
              requestBody.ps_component
            }`,
          })
        })
        .catch((error) => {
          const displayedError = getDisplayedOsidbError(error);
          addToast({
            title: 'Error saving Affect',
            body: displayedError,
          });
          console.log(error);
        });
    }
    if (wereAffectsModified.value) {
      const requestBody = affectsToUpdate.value.map((affect) => ({
        flaw: flaw.value?.uuid,
        type: affect.type,
        affectedness: affect.affectedness,
        resolution: affect.resolution,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
        impact: affect.impact,
        embargoed: affect.embargoed || false,
        updated_dt: affect.updated_dt,
      }))
      await putAffects(requestBody);
      wereAffectsModified.value = false;
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
  };
}
