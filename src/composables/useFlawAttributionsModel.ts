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
import { ref, type Ref } from 'vue';

export function useFlawAttributionsModel(flaw: Ref<ZodFlawType>, emit: any) {

  const flawReferences = ref<ZodFlawReferenceType[]>(flaw.value.references);
  const flawAcknowledgments = ref<ZodFlawAcknowledgmentType[]>(flaw.value.acknowledgments);

  async function updateReference(reference: ZodFlawReferenceType & { uuid: string }) {
    await putFlawReference(flaw.value.uuid, reference.uuid, reference as any);
    emit('refresh:flaw');
  }

  async function createReference(reference: ZodFlawReferenceType) {
    await postFlawReference(flaw.value.uuid, reference);
    emit('refresh:flaw');
  }

  async function deleteReference(referenceId: string) {
    await deleteFlawReference(flaw.value.uuid, referenceId);
    emit('refresh:flaw');
  }

  async function saveReferences(references: ZodFlawReferenceType[]) {
    for (const reference of references) {
      if (reference.uuid) {
        await updateReference(reference);
      } else {
        await createReference(reference);
      }
    }
    // await Promise.all(
    //   references.map((reference) =>
    //     reference.uuid ? updateReference(reference) : createReference(reference),
    //   ),
    // );
    emit('refresh:flaw');
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
    await postFlawAcknowledgment(flaw.value.uuid, acknowlegdment);
    emit('refresh:flaw');
  }

  async function deleteAcknowledgment(acknowledgmentId: string) {
    await deleteFlawAcknowledgment(flaw.value.uuid, acknowledgmentId);
    emit('refresh:flaw');
  }

  async function updateAcknowledgment(acknowlegdment: any) {
    await putFlawAcknowledgment(flaw.value.uuid, acknowlegdment.uuid, acknowlegdment as any);
    emit('refresh:flaw');
  }

  async function saveAcknowledgments(acknowledgments: ZodFlawAcknowledgmentType[]) {
    for (const acknowledgment of acknowledgments) {
      if (acknowledgment.uuid) {
        await updateAcknowledgment(acknowledgment);
      } else {
        await createAcknowledgment(acknowledgment);
      }
    }
    // await Promise.all(
    //   references.map((reference) =>
    //     reference.uuid ? updateReference(reference) : createReference(reference),
    //   ),
    // );
    emit('refresh:flaw');
  }

  function addBlankAcknowledgment(isEmbargoed: boolean) {
    flawAcknowledgments.value.push({
      name: '',
      affiliation: '',
      from_upstream: false,
      flaw: '',
      uuid: '',
      embargoed: isEmbargoed,
      created_dt: '',
      updated_dt: '',
    });
  }

  return {
    flawReferences,
    flawAcknowledgments,
    saveAcknowledgments,
    saveReferences,
    addBlankReference,
    addBlankAcknowledgment,
    createReference,
    updateReference,
    deleteReference,
    createAcknowledgment,
    updateAcknowledgment,
    deleteAcknowledgment,
  };
}
