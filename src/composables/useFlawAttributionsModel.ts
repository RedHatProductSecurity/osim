import { toRef, watch, type Ref } from 'vue';

import { createCatchHandler } from '@/composables/service-helpers';
import {
  isAlreadyDeleted,
  isAttributionConflict,
  isMissingAttribution,
  useAttributionCollision,
} from '@/composables/useAttributionCollision';

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

export function useFlawAttributionsModel(flaw: Ref<ZodFlawType>, isSaving: Ref<boolean>, afterSaveSuccess: () => void) {
  const flawReferences: Ref<ZodFlawReferenceType[]> = toRef(flaw.value, 'references');
  const flawAcknowledgments: Ref<ZodFlawAcknowledgmentType[]> = toRef(flaw.value, 'acknowledgments');

  watch(() => flaw.value.references, () => {
    flawReferences.value = flaw.value.references;
  });

  watch(() => flaw.value.acknowledgments, () => {
    flawAcknowledgments.value = flaw.value.acknowledgments;
  });

  async function updateReference(
    reference: { uuid: string } & ZodFlawReferenceType,
    options?: { suppressConflictToast?: boolean },
  ) {
    isSaving.value = true;
    try {
      const response = await putFlawReference(flaw.value.uuid, reference.uuid, reference as any, options);
      // Sync concurrency token from response for subsequent edits
      if (response?.data) {
        const index = flawReferences.value.findIndex(ref => ref.uuid === reference.uuid);
        if (index !== -1) {
          flawReferences.value[index] = { ...flawReferences.value[index], ...response.data };
        }
      }
    } finally {
      isSaving.value = false;
    }
  }

  async function createReference(reference: ZodFlawReferenceType) {
    isSaving.value = true;
    const response = await postFlawReference(flaw.value.uuid, reference)
      .finally(() => isSaving.value = false);

    // Update the local reference with the UUID from the server response
    if (response?.data?.uuid) {
      const index = flawReferences.value.findIndex(ref => ref === reference);
      if (index !== -1) {
        flawReferences.value[index] = { ...reference, ...response.data };
      }
    }
  }

  async function deleteReference(referenceId: string) {
    isSaving.value = true;
    try {
      await deleteFlawReference(flaw.value.uuid, referenceId, { suppressErrorToast: true });
    } catch (error) {
      // A 404 or a 'does not exist' body means the server already dropped it.
      if (!isAlreadyDeleted(error) && !isMissingAttribution(error)) {
        createCatchHandler('Error deleting Reference:', false)(error);
        throw error;
      }
      flaw.value.references = flaw.value.references.filter(ref => ref.uuid !== referenceId);
    } finally {
      isSaving.value = false;
    }
    afterSaveSuccess();
  }

  function cancelAddReference(reference: ZodFlawReferenceType) {
    flawReferences.value.splice(flawReferences.value.indexOf(reference), 1);
  }

  function addBlankReference(isEmbargoed: boolean) {
    flawReferences.value.push({
      description: '',
      type: 'ARTICLE',
      url: '',
      embargoed: isEmbargoed,
      updated_dt: null,
      uuid: '',
      alerts: [],
    });
  }

  async function createAcknowledgment(acknowledgment: ZodFlawAcknowledgmentType) {
    isSaving.value = true;
    const response = await postFlawAcknowledgment(flaw.value.uuid, acknowledgment)
      .finally(() => isSaving.value = false);

    // Update the local acknowledgment with the UUID from the server response
    if (response?.data?.uuid) {
      const index = flawAcknowledgments.value.findIndex(ack => ack === acknowledgment);
      if (index !== -1) {
        flawAcknowledgments.value[index] = { ...acknowledgment, ...response.data };
      }
    }
  }

  async function deleteAcknowledgment(acknowledgmentId: string) {
    isSaving.value = true;
    try {
      await deleteFlawAcknowledgment(flaw.value.uuid, acknowledgmentId, { suppressErrorToast: true });
    } catch (error) {
      // A 404 or a 'does not exist' body means the server already dropped it.
      if (!isAlreadyDeleted(error) && !isMissingAttribution(error)) {
        createCatchHandler('Error deleting Acknowledgment:', false)(error);
        throw error;
      }
      flaw.value.acknowledgments = flaw.value.acknowledgments.filter(ack => ack.uuid !== acknowledgmentId);
    } finally {
      isSaving.value = false;
    }
    afterSaveSuccess();
  }

  async function updateAcknowledgment(
    acknowledgment: ZodFlawAcknowledgmentType,
    options?: { suppressConflictToast?: boolean },
  ) {
    isSaving.value = true;
    try {
      const response = await putFlawAcknowledgment(
        flaw.value.uuid,
        acknowledgment.uuid,
        acknowledgment as any,
        options,
      );
      // Sync concurrency token from response for subsequent edits
      if (response?.data) {
        const index = flawAcknowledgments.value.findIndex(ack => ack.uuid === acknowledgment.uuid);
        if (index !== -1) {
          flawAcknowledgments.value[index] = { ...flawAcknowledgments.value[index], ...response.data };
        }
      }
    } finally {
      isSaving.value = false;
    }
  }

  const {
    applyAttributionResolution,
    integrateServerAttributions,
    pendingAttributionConflict,
    stageAttributionConflicts,
  } = useAttributionCollision({
    acknowledgments: { create: createAcknowledgment, update: updateAcknowledgment },
    references: { create: createReference, update: updateReference },
  });

  async function saveReferences(references: ZodFlawReferenceType[]) {
    isSaving.value = true;
    const unsaved = [...references];
    try {
      while (unsaved.length > 0) {
        const reference = unsaved[0];
        try {
          if (reference.uuid) {
            await updateReference(reference, { suppressConflictToast: true });
          } else {
            await createReference(reference);
          }
          unsaved.shift();
        } catch (error) {
          if (!isAttributionConflict(error)) throw error;
          // Staging either opens the collision dialog (it rethrows so the list
          // stays dirty) or adopts the server state and finishes the save.
          await stageAttributionConflicts('references', error, unsaved);
          break;
        }
      }
      // Fold in server-side changes the save did not touch, staging any
      // both-side overlap it finds for the collision dialog.
      await integrateServerAttributions();
    } finally {
      isSaving.value = false;
    }
    afterSaveSuccess();
  }

  async function saveAcknowledgments(acknowledgments: ZodFlawAcknowledgmentType[]) {
    isSaving.value = true;
    const unsaved = [...acknowledgments];
    try {
      while (unsaved.length > 0) {
        const acknowledgment = unsaved[0];
        try {
          if (acknowledgment.uuid) {
            await updateAcknowledgment(acknowledgment, { suppressConflictToast: true });
          } else {
            await createAcknowledgment(acknowledgment);
          }
          unsaved.shift();
        } catch (error) {
          if (!isAttributionConflict(error)) throw error;
          // Staging either opens the collision dialog (it rethrows so the list
          // stays dirty) or adopts the server state and finishes the save.
          await stageAttributionConflicts('acknowledgments', error, unsaved);
          break;
        }
      }
      // Fold in server-side changes the save did not touch, staging any
      // both-side overlap it finds for the collision dialog.
      await integrateServerAttributions();
    } finally {
      isSaving.value = false;
    }
    afterSaveSuccess();
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
      alerts: [],
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
    applyAttributionResolution,
    integrateServerAttributions,
    pendingAttributionConflict,
    stageAttributionConflicts,
  };
}
