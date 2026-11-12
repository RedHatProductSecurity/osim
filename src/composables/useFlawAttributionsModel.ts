import { toRef, watch, toRaw, type Ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';
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
  const { acceptServerCollections, initialFlaw } = useFlaw();
  const flawReferences: Ref<ZodFlawReferenceType[]> = toRef(flaw.value, 'references');
  const flawAcknowledgments: Ref<ZodFlawAcknowledgmentType[]> = toRef(flaw.value, 'acknowledgments');

  // Nested saves share one isSaving window: per-item operations must not end
  // the surrounding list save early, so only the outermost save clears the flag.
  let savingDepth = 0;

  function startSaving() {
    savingDepth += 1;
    isSaving.value = true;
  }

  function finishSaving() {
    savingDepth = Math.max(0, savingDepth - 1);
    if (savingDepth === 0) isSaving.value = false;
  }

  watch(() => flaw.value.references, () => {
    flawReferences.value = flaw.value.references;
  });

  watch(() => flaw.value.acknowledgments, () => {
    flawAcknowledgments.value = flaw.value.acknowledgments;
  });

  /** Sync the concurrency token from a PUT response back into the list. */
  function syncReferenceResponse(reference: { uuid: string }, response?: { data?: any }) {
    if (response?.data) {
      const index = flawReferences.value.findIndex(ref => ref.uuid === reference.uuid);
      if (index !== -1) {
        flawReferences.value[index] = { ...flawReferences.value[index], ...response.data };
      }
    }
  }

  /** PUT a reference, always forwarding the options argument positionally. */
  async function putReference(reference: ZodFlawReferenceType, options?: { suppressConflictToast?: boolean }) {
    const response = await putFlawReference(flaw.value.uuid, reference.uuid, reference as any, options);
    syncReferenceResponse(reference, response);
  }

  async function updateReference(
    reference: { uuid: string } & ZodFlawReferenceType,
    options?: { suppressConflictToast?: boolean },
  ) {
    startSaving();
    try {
      if (options) {
        await putReference(reference, options);
        return;
      }
      // Option-less callers keep the plain three-argument service call.
      const response = await putFlawReference(flaw.value.uuid, reference.uuid, reference as any);
      syncReferenceResponse(reference, response);
    } finally {
      finishSaving();
    }
  }

  async function createReference(reference: ZodFlawReferenceType) {
    startSaving();
    try {
      const response = await postFlawReference(flaw.value.uuid, reference);

      // Update the local reference with the UUID from the server response.
      // The list holds reactive proxies, so match the raw objects underneath.
      if (response?.data?.uuid) {
        const index = flawReferences.value.findIndex(ref => toRaw(ref) === toRaw(reference));
        if (index !== -1) {
          flawReferences.value[index] = { ...reference, ...response.data };
        }
      }
    } finally {
      finishSaving();
    }
  }

  async function deleteReference(referenceId: string) {
    startSaving();
    try {
      await deleteFlawReference(flaw.value.uuid, referenceId, { suppressErrorToast: true });
    } catch (error) {
      // A 404 or a 'does not exist' body means the server already dropped it.
      if (!isAlreadyDeleted(error) && !isMissingAttribution(error)) {
        createCatchHandler('Error deleting Reference:', false)(error);
        throw error;
      }
      flaw.value.references = flaw.value.references.filter(ref => ref.uuid !== referenceId);
      // Baseline the server-confirmed removal so the form stays clean for it.
      // initialFlaw exposes the baseline read-only; the clone detaches it.
      acceptServerCollections({
        references: initialFlaw.value.references.filter(ref => ref.uuid !== referenceId) as ZodFlawReferenceType[],
      });
    } finally {
      finishSaving();
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
    startSaving();
    try {
      const response = await postFlawAcknowledgment(flaw.value.uuid, acknowledgment);

      // Update the local acknowledgment with the UUID from the server response.
      // The list holds reactive proxies, so match the raw objects underneath.
      if (response?.data?.uuid) {
        const index = flawAcknowledgments.value.findIndex(ack => toRaw(ack) === toRaw(acknowledgment));
        if (index !== -1) {
          flawAcknowledgments.value[index] = { ...acknowledgment, ...response.data };
        }
      }
    } finally {
      finishSaving();
    }
  }

  async function deleteAcknowledgment(acknowledgmentId: string) {
    startSaving();
    try {
      await deleteFlawAcknowledgment(flaw.value.uuid, acknowledgmentId, { suppressErrorToast: true });
    } catch (error) {
      // A 404 or a 'does not exist' body means the server already dropped it.
      if (!isAlreadyDeleted(error) && !isMissingAttribution(error)) {
        createCatchHandler('Error deleting Acknowledgment:', false)(error);
        throw error;
      }
      flaw.value.acknowledgments = flaw.value.acknowledgments.filter(ack => ack.uuid !== acknowledgmentId);
      // Baseline the server-confirmed removal so the form stays clean for it.
      // initialFlaw exposes the baseline read-only; the clone detaches it.
      acceptServerCollections({
        acknowledgments: initialFlaw.value.acknowledgments.filter(
          ack => ack.uuid !== acknowledgmentId,
        ) as ZodFlawAcknowledgmentType[],
      });
    } finally {
      finishSaving();
    }
    afterSaveSuccess();
  }

  /** Sync the concurrency token from a PUT response back into the list. */
  function syncAcknowledgmentResponse(acknowledgment: { uuid: string }, response?: { data?: any }) {
    if (response?.data) {
      const index = flawAcknowledgments.value.findIndex(ack => ack.uuid === acknowledgment.uuid);
      if (index !== -1) {
        flawAcknowledgments.value[index] = { ...flawAcknowledgments.value[index], ...response.data };
      }
    }
  }

  /** PUT an acknowledgment, always forwarding the options argument positionally. */
  async function putAcknowledgment(
    acknowledgment: ZodFlawAcknowledgmentType,
    options?: { suppressConflictToast?: boolean },
  ) {
    const response = await putFlawAcknowledgment(
      flaw.value.uuid,
      acknowledgment.uuid,
      acknowledgment as any,
      options,
    );
    syncAcknowledgmentResponse(acknowledgment, response);
  }

  async function updateAcknowledgment(
    acknowledgment: ZodFlawAcknowledgmentType,
    options?: { suppressConflictToast?: boolean },
  ) {
    startSaving();
    try {
      if (options) {
        await putAcknowledgment(acknowledgment, options);
        return;
      }
      // Option-less callers keep the plain three-argument service call.
      const response = await putFlawAcknowledgment(flaw.value.uuid, acknowledgment.uuid, acknowledgment as any);
      syncAcknowledgmentResponse(acknowledgment, response);
    } finally {
      finishSaving();
    }
  }

  const {
    applyAttributionResolution,
    integrateServerAttributions,
    mergeServerAttributions,
    pendingAttributionConflict,
    stageAttributionConflicts,
  } = useAttributionCollision({
    acknowledgments: { create: createAcknowledgment, update: putAcknowledgment },
    finishSaving,
    references: { create: createReference, update: putReference },
    startSaving,
  });

  async function saveReferences(references: ZodFlawReferenceType[]) {
    startSaving();
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
      finishSaving();
    }
    afterSaveSuccess();
  }

  async function saveAcknowledgments(acknowledgments: ZodFlawAcknowledgmentType[]) {
    startSaving();
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
      finishSaving();
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
    mergeServerAttributions,
    pendingAttributionConflict,
    stageAttributionConflicts,
  };
}
