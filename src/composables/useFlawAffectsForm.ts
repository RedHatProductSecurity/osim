import { type Ref, ref, toRef, computed } from 'vue';

import { type Flaw, type Affect } from '@/generated-client';
import { postAffect, putAffect } from '@/services/AffectService';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';

export function useFlawAffectsForm(flaw: Ref<Flaw>) {
  const wereAffectsModified = ref(false);
  const modifiedAffectIds = ref<string[]>([]);
  const affectIdsToDelete = ref<string[]>([]);
  const theAffects = toRef(flaw.value, 'affects') as Ref<Affect[]>;

  const affectsToSave = computed(() => [
    ...theAffects.value.filter((affect) => modifiedAffectIds.value.includes(affect.uuid)),
    ...theAffects.value.filter((affect) => !affect.uuid),
  ]);

  const { addToast } = useToastStore();

  function addBlankAffect() {
    theAffects.value.push({} as Affect);
  }

  function removeAffect(affectIdx: number) {
    // TODO: Send delete request to OSIDB
    affectIdsToDelete.value.push(theAffects.value[affectIdx].uuid);
    theAffects.value.splice(affectIdx, 1);
  }

  function reportAffectAsModified(affectId: string) {
    wereAffectsModified.value = true;
    modifiedAffectIds.value.push(affectId);
    console.log(modifiedAffectIds.value);
  }

  const saveAffects = async () => {
    const affectsToSaveQuantity = affectsToSave.value.length;
    for (let [index, affect] of Object.entries(affectsToSave.value)) {
      console.log(`Saving affect ${+index + 1} of ${affectsToSaveQuantity}`, affect);
      console.log(affect.uuid);
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
      if (affect.uuid != null) {
        await putAffect(affect.uuid, requestBody)
          .then(() => {
            console.log('saved newAffect', requestBody);
            addToast({
              title: 'Info',
              body: `Affect ${+index + 1} of ${affectsToSaveQuantity} Saved: ${
                requestBody.ps_component
              }`,
            });
          })
          .catch((error) => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          });
      } else {
        await postAffect(requestBody)
          .then(() => {
            console.log('saved newAffect', requestBody);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${requestBody.ps_component}`,
            });
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
    }
  };

  return {
    wereAffectsModified,
    addBlankAffect,
    removeAffect,
    saveAffects,
    theAffects,
    reportAffectAsModified,
  };
}

