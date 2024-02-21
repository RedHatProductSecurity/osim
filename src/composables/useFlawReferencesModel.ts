import type {
  ZodFlawReferenceType,
  ZodFlawType,
  ZodFlawAcknowledgmentType,
} from './../types/zodFlaw';
import {
  postFlawReference,
  putFlawReference,
  postFlawAcknowledgment,
  putFlawAcknowledgment,
} from '@/services/FlawService';
import { ref, type Ref } from 'vue';

export function useFlawReferencesModel(flaw: Ref<ZodFlawType>, emit: any) {

  const flawReferences = ref<ZodFlawReferenceType[]>(flaw.value.references);
  const flawAcknowlegdments = ref<ZodFlawAcknowledgmentType[]>(flaw.value.acknowledgments);

  async function updateReference(reference: ZodFlawReferenceType & { uuid: string }) {
    await putFlawReference(flaw.value.uuid, reference.uuid, reference as any);
    emit('refresh:flaw');
  }

  async function createReference(reference: ZodFlawReferenceType) {
    await postFlawReference(flaw.value.uuid, reference);
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

  async function createAcknowledgment(acknowlegdment: any) {
    await postFlawAcknowledgment(flaw.value.uuid, acknowlegdment);
    emit('refresh:flaw');
  }

  async function updateAcknowledgment(acknowlegdment: any) {
    await putFlawAcknowledgment(flaw.value.uuid, acknowlegdment.uuid, acknowlegdment as any);
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

  function addBlankAcknowledgment(isEmbargoed: boolean) {
    flawAcknowlegdments.value.push({
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
    flawAcknowlegdments,
    saveReferences,
    addBlankReference,
    addBlankAcknowledgment,
    createReference,
    updateReference,
    createAcknowledgment,
    updateAcknowledgment,
  };
}
