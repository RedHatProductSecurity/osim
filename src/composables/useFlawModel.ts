import { computed, ref } from 'vue';

import { useRouter } from 'vue-router';
import { type ZodIssue } from 'zod';
import { modifyPath } from 'ramda';

import { useFlaw } from '@/composables/useFlaw';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlawCommentsModel } from '@/composables/useFlawCommentsModel';
import { useFlawAttributionsModel } from '@/composables/useFlawAttributionsModel';
import { useNetworkQueue } from '@/composables/useNetworkQueue';
import { useCvssScores, validateCvssVector } from '@/composables/useCvssScores';
import { useFlawLabels } from '@/composables/useFlawLabels';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlaw,
  putFlaw,
} from '@/services/FlawService';
import { useDraftFlawStore } from '@/stores/DraftFlawStore';
import { useToastStore } from '@/stores/ToastStore';
import { deepMap, mergeBy } from '@/utils/helpers';
import {
  flawSources,
  flawImpacts,
  flawIncidentStates,
  ZodFlawSchema,
  type DeepMapValues,
  type DeepNullable,
  type ZodFlawType,
  type ZodAffectType,
  type ZodFlawLabelType,
} from '@/types';
import { osimRuntime } from '@/stores/osimRuntime';

import { createSuccessHandler, createCatchHandler } from './service-helpers';
import { useAffectsModel } from './useAffectsModel';

function useAffectsModelV2() {
  if (osimRuntime.value.flags?.affectsV2) {
    const {
      actions: { initializeAffects, removeAffects, resetSavedAffects, saveAffects },
      state: { removedAffects, wereAffectsEditedOrAdded },
    } = useAffectsModel();

    return {
      setInitialAffects: () => initializeAffects(useFlaw().flaw.value.affects),
      resetSavedAffects: resetSavedAffects,
      saveAffects,
      wereAffectsEditedOrAdded,
      removeAffects,
      affectsToDelete: {
        value: {
          get length() {
            return removedAffects.size;
          },
        },
      },
    };
  }
  return {
    ...useFlawAffectsModel(),
    resetSavedAffects: undefined,
  };
}

export function useFlawModel() {
  const { flaw, isFlawUpdated, setFlaw } = useFlaw();
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const shouldCreateJiraTask = ref(false);
  const { getAegisMetadata, hasAegisChanges } = useAegisMetadataTracking();

  function getAegisMetadataIfChanged() {
    return hasAegisChanges() ? { aegis_meta: getAegisMetadata() } : {};
  }

  const flawAttributionsModel = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);

  const {
    cvssVector,
    cvssVersion,
    saveCvssScores,
    updateVector,
    wasFlawCvssModified,
  } = useCvssScores();

  const {
    affectsToDelete,
    removeAffects,
    resetSavedAffects,
    saveAffects,
    setInitialAffects,
    wereAffectsEditedOrAdded,
  } = useAffectsModelV2();

  const { areLabelsUpdated, updateLabels } = useFlawLabels();

  const router = useRouter();
  const { saveDraftFlaw } = useDraftFlawStore();

  const bugzillaLink = computed(() => getFlawBugzillaLink(flaw.value));
  const osimLink = computed(() => getFlawOsimLink(flaw.value.uuid));
  const isInTriageWithoutAffects = computed(() =>
    flaw.value.classification?.state === 'TRIAGE'
    && flaw.value.affects.every(affect => !affect.uuid),
  );

  function isValid() {
    return ZodFlawSchema.safeParse(flaw.value).success;
  }

  async function createFlaw() {
    isSaving.value = true;

    const validatedFlaw = validate();
    if (!validatedFlaw.success) {
      isSaving.value = false;
      return;
    }
    // Remove any empty fields before request and add aegis metadata if there are AI changes
    const flawForPost: any = {
      ...Object.fromEntries(
        Object.entries(validatedFlaw.data).filter(([, value]) => value !== ''),
      ),
      ...getAegisMetadataIfChanged(),
    };
    try {
      // TODO: Refactor promise chain
      await postFlaw(flawForPost)
        .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
        .then(async (response: any) => {
          flaw.value.uuid = response.uuid;
          saveDraftFlaw(flaw.value);
          if (flaw.value.acknowledgments.length > 0) {
            const acknowledgments = await flawAttributionsModel.saveAcknowledgments(flaw.value.acknowledgments);
            response.acknowledgments = acknowledgments;
          }
          if (flaw.value.references.length > 0) {
            const references = await flawAttributionsModel.saveReferences(flaw.value.references);
            response.references = references;
          }
          return response;
        })
        .catch(createCatchHandler('Error creating Flaw'))
        .finally(async () => {
          if (flaw.value.uuid) {
            if (wasFlawCvssModified.value) {
              await saveCvssScores()
                .catch(createCatchHandler('Error saving CVSS scores after creating Flaw'));
            }

            router.push({ name: 'flaw-details', params: { id: flaw.value.uuid } });
          }
        });
    } catch (error) {
      console.error('useFlawModel::createFlaw() Error when saving flaw:', error);
    } finally {
      isSaving.value = false;
    }
  }

  function validate() {
    const validatedFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!validatedFlaw.success) {
      const errorMessage = ({ message, path }: ZodIssue) => `${path.join('/')}: ${message}`;

      addToast({
        title: 'Flaw validation failed before submission',
        body: validatedFlaw.error.issues.map(errorMessage).join('\n '),
        css: 'warning',
      });
    }

    if (wasFlawCvssModified.value) {
      const validatedCVSS = validateCvssVector(cvssVector.value, cvssVersion.value);
      if (validatedCVSS !== null) {
        addToast({
          title: 'CVSS Vector validation failed',
          body: validatedCVSS,
          css: 'warning',
        });
        validatedFlaw.success = false;
      }
    }

    return validatedFlaw;
  }

  async function updateFlaw() {
    const { execute } = useNetworkQueue();
    const queue: (() => Promise<any>)[] = [];
    const afterSuccessQueue: (() => void)[] = [];

    isSaving.value = true;
    const validatedFlaw = validate();

    if (!validatedFlaw.success) {
      isSaving.value = false;
      return;
    }

    // If the flaw is in triage and has no affects, we need to save the affects first
    if (isInTriageWithoutAffects.value && wereAffectsEditedOrAdded.value) {
      queue.push(async () => {
        const response = await saveAffects();

        if (osimRuntime.value.flags?.affectsV2 && typeof response === 'object' && 'savedAffects' in response) {
          const { hasErrors, savedAffects } = response;
          // Always merge saved affects into flaw state (even on partial success)
          afterSuccessQueue.push(() => setFlaw(mergeBy(flaw.value.affects, savedAffects, 'uuid'), 'affects'));

          // If no errors, do full reset; if partial success, only reset saved items
          if (hasErrors && resetSavedAffects) {
            afterSuccessQueue.push(() => resetSavedAffects(savedAffects));
          } else {
            afterSuccessQueue.push(setInitialAffects);
          }
        } else {
          afterSuccessQueue.push(() => setFlaw(response as ZodAffectType[], 'affects', false));
          afterSuccessQueue.push(setInitialAffects);
        }
      });
    }

    if (isFlawUpdated.value || shouldCreateJiraTask.value) {
      queue.push(async () => {
        // Add aegis metadata if there are AI changes
        const response = await putFlaw(flaw.value.uuid, {
          ...validatedFlaw.data,
          ...getAegisMetadataIfChanged(),
        }, shouldCreateJiraTask.value);
        afterSuccessQueue.push(() => setFlaw(response));
      },
      );
    }
    if (wasFlawCvssModified.value) {
      queue.push(async () => {
        const response = await saveCvssScores();
        afterSuccessQueue.push(() => setFlaw(response, 'cvss_scores'));
      });
    }

    if (affectsToDelete.value.length) {
      if (osimRuntime.value.flags?.affectsV2) {
        queue.push(async () => {
          const response = await removeAffects();

          if (response && typeof response === 'object' && 'deletedUuids' in response) {
            const { deletedUuids, hasErrors } = response;

            // Remove successfully deleted affects from flaw state
            if (deletedUuids.length > 0) {
              afterSuccessQueue.push(() =>
                setFlaw(flaw.value.affects.filter(({ uuid }) => uuid && !deletedUuids.includes(uuid)), 'affects'),
              );
            }

            // Only do full reset if all deletions succeeded
            if (!hasErrors) {
              afterSuccessQueue.push(setInitialAffects);
            }
            // If hasErrors, failed deletions stay in removedAffects Set for retry
          }
        });
      } else {
        queue.push(removeAffects);
      }
    }

    if (!isInTriageWithoutAffects.value && wereAffectsEditedOrAdded.value) {
      queue.push(async () => {
        const response = await saveAffects();

        if (osimRuntime.value.flags?.affectsV2 && typeof response === 'object' && 'savedAffects' in response) {
          const { hasErrors, savedAffects } = response;
          // Always merge saved affects into flaw state (even on partial success)
          afterSuccessQueue.push(() => setFlaw(mergeBy(flaw.value.affects, savedAffects, 'uuid'), 'affects'));

          // If no errors, do full reset; if partial success, only reset saved items
          if (hasErrors && resetSavedAffects) {
            afterSuccessQueue.push(() => resetSavedAffects(savedAffects));
          } else {
            afterSuccessQueue.push(setInitialAffects);
          }
        } else {
          afterSuccessQueue.push(() => setFlaw(response as ZodAffectType[], 'affects', false));
          afterSuccessQueue.push(setInitialAffects);
        }
      });
    }

    if (areLabelsUpdated.value) {
      queue.push(async () => {
        const response = await updateLabels();
        if (response && Array.isArray(response)) {
          const labels = response
            .filter((result): result is PromiseFulfilledResult<{ data: any; response: Response }> =>
              result.status === 'fulfilled' && result.value?.data)
            .map(result => result.value.data);
          afterSuccessQueue.push(() => setFlaw(labels as ZodFlawLabelType[], 'labels', false));
        }
      });
    }

    try {
      return await execute(...queue);
    } catch (error) {
      console.error('useFlawModel::updateFlaw() Error updating flaw:', error);
      isSaving.value = false;
      return;
    } finally {
      afterSaveSuccess(afterSuccessQueue);
    }
  }

  async function afterSaveSuccess(queue?: (() => void)[]) {
    isSaving.value = false;
    if (!queue) return;
    const promisedQueue = queue.map(fn => new Promise(fn));
    for (const promise of promisedQueue) {
      await promise;
    }
  }

  const errors = computed<ReturnType<typeof flawErrors>>((previousErrors) => {
    const newErrors = flawErrors(flaw.value);
    if (previousErrors && JSON.stringify(previousErrors) === JSON.stringify(newErrors)) {
      return previousErrors;
    }
    return newErrors;
  });

  const toggleShouldCreateJiraTask = () => {
    shouldCreateJiraTask.value = !shouldCreateJiraTask.value;
  };

  return {
    isSaving,
    isValid,
    errors,
    flawSources,
    flawImpacts,
    flawIncidentStates,
    osimLink,
    bugzillaLink,
    shouldCreateJiraTask,
    toggleShouldCreateJiraTask,
    createFlaw,
    updateFlaw,
    afterSaveSuccess,
    updateVector,
    ...useFlawCommentsModel(flaw, isSaving, afterSaveSuccess),
    ...useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess),
  };
}

function flawErrors(flaw: ZodFlawType): DeepNullable<DeepMapValues<ZodFlawType, string>> {
  const parsedFlaw = ZodFlawSchema.safeParse(flaw);
  let mirroredFlaw = deepMap(() => null, flaw);

  if (parsedFlaw.success) {
    return mirroredFlaw;
  }

  parsedFlaw.error.errors
    .map(({ message, path }) => ({ path, message }))
    .forEach(({ message, path }) => {
      mirroredFlaw = modifyPath(path, () => message, mirroredFlaw);
    });

  return mirroredFlaw;
}
