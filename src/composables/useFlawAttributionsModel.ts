import type {
  ZodFlawReferenceType,
  ZodFlawType,
  ZodFlawAcknowledgmentType,
} from '@/types/zodFlaw';
import {
  postFlawReference,
  putFlawReference,
  deleteFlawReference,
  postFlawAcknowledgment,
  putFlawAcknowledgment,
  deleteFlawAcknowledgment,
} from '@/services/FlawService';
import { toRef, watch, type Ref } from 'vue';

export function useFlawAttributionsModel(flaw: Ref<ZodFlawType>, isSaving: Ref<boolean>, afterSaveSuccess: () => void) {

  const flawReferences: Ref<ZodFlawReferenceType[]> = toRef(flaw.value, 'references');
  const flawAcknowledgments: Ref<ZodFlawAcknowledgmentType[]> = toRef(flaw.value, 'acknowledgments');

  watch(() => flaw.value.references, () => {
    flawReferences.value = flaw.value.references;
  });

  watch(() => flaw.value.acknowledgments, () => {
    flawAcknowledgments.value = flaw.value.acknowledgments;
  });

  async function updateReference(reference: ZodFlawReferenceType & { uuid: string }) {
    isSaving.value = true;
    await putFlawReference(flaw.value.uuid, reference.uuid, reference as any)
      .finally(() => isSaving.value = false);
    afterSaveSuccess();
  }

  async function createReference(reference: ZodFlawReferenceType) {
    isSaving.value = true;
    await postFlawReference(flaw.value.uuid, reference)
      .finally(() => isSaving.value = false);
    afterSaveSuccess();
  }

  async function deleteReference(referenceId: string) {
    isSaving.value = true;
    await deleteFlawReference(flaw.value.uuid, referenceId)
      .finally(() => isSaving.value = false);
    afterSaveSuccess();
  }

  function cancelAddReference(reference: ZodFlawReferenceType) {
    flawReferences.value.splice(flawReferences.value.indexOf(reference), 1);
  }

  async function saveReferences(references: ZodFlawReferenceType[]) {
    isSaving.value = true;
    for (const reference of references) {
      if (reference.uuid) {
        await updateReference(reference);
      } else {
        await createReference(reference);
      }
    }
  }

  function addBlankReference(isEmbargoed: boolean) {
    flawReferences.value.push({
      description: '',
      type: 'ARTICLE',
      url: '',
      embargoed: isEmbargoed,
      updated_dt: null,
      uuid: '',
    });
  }

  async function createAcknowledgment(acknowlegdment: any) {
    isSaving.value = true;
    await postFlawAcknowledgment(flaw.value.uuid, acknowlegdment)
      .finally(() => isSaving.value = false);
    afterSaveSuccess();
  }

  async function deleteAcknowledgment(acknowledgmentId: string) {
    isSaving.value = true;
    await deleteFlawAcknowledgment(flaw.value.uuid, acknowledgmentId)
      .finally(() => isSaving.value = false);
    afterSaveSuccess();
  }

  async function updateAcknowledgment(acknowlegdment: any) {
    isSaving.value = true;
    await putFlawAcknowledgment(flaw.value.uuid, acknowlegdment.uuid, acknowlegdment as any)
      .finally(() => isSaving.value = false);
    afterSaveSuccess();
  }

  async function saveAcknowledgments(acknowledgments: ZodFlawAcknowledgmentType[]) {
    for (const acknowledgment of acknowledgments) {
      if (acknowledgment.uuid) {
        await updateAcknowledgment(acknowledgment);
      } else {
        await createAcknowledgment(acknowledgment);
      }
    }
  }

  function addBlankAcknowledgment(isEmbargoed: boolean) {
    flawAcknowledgments.value.push({
      name: '',
      affiliation: '',
      from_upstream: false,
      flaw: '',
      uuid: '',
      embargoed: isEmbargoed,
      created_dt: null,
      updated_dt: null,
    });
  }

  function cancelAddAcknowledgment(acknowledgment: ZodFlawAcknowledgmentType) {
    flawAcknowledgments.value.splice(flawAcknowledgments.value.indexOf(acknowledgment), 1);
  }

  return {
    flawReferences,
    flawAcknowledgments,
    saveAcknowledgments,
    saveReferences,
    addBlankReference,
    addBlankAcknowledgment,
    cancelAddReference,
    cancelAddAcknowledgment,
    createReference,
    updateReference,
    deleteReference,
    createAcknowledgment,
    updateAcknowledgment,
    deleteAcknowledgment,
  };
}
