import { computed, ref } from 'vue';

import { useRouter } from 'vue-router';
import { modifyPath } from 'ramda';
import type { ZodIssue } from 'zod';

import { useFlaw } from '@/composables/useFlaw';
import { useFlawCvssScores } from '@/composables/useFlawCvssScores';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlawCommentsModel } from '@/composables/useFlawCommentsModel';
import { useFlawAttributionsModel } from '@/composables/useFlawAttributionsModel';
import { useNetworkQueue } from '@/composables/useNetworkQueue';
import { validateCvssVector } from '@/composables/useCvssCalculator';

import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlaw,
  putFlaw,
} from '@/services/FlawService';
import { useDraftFlawStore } from '@/stores/DraftFlawStore';
import { useToastStore } from '@/stores/ToastStore';
import { deepMap } from '@/utils/helpers';
import {
  flawSources,
  flawImpacts,
  flawIncidentStates,
  ZodFlawSchema,
  type ZodFlawType,
  type ZodAffectType,
  type ZodFlawLabelType,
} from '@/types';

import { createSuccessHandler, createCatchHandler } from './service-helpers';
import { useFlawLabels } from './useFlawLabels';

export function useFlawModel() {
  const { flaw, isFlawUpdated, setFlaw } = useFlaw();
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const shouldCreateJiraTask = ref(false);
  const cvssScoresModel = useFlawCvssScores(flaw);

  const flawAttributionsModel = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);
  const { flawRhCvss3, saveCvssScores, wasCvssModified } = cvssScoresModel;
  const {
    affectsToDelete,
    removeAffects,
    saveAffects,
    wereAffectsEditedOrAdded,
  } = useFlawAffectsModel();

  const { areLabelsUpdated, updateLabels } = useFlawLabels();

  const router = useRouter();
  const { saveDraftFlaw } = useDraftFlawStore();

  const bugzillaLink = computed(() => getFlawBugzillaLink(flaw.value));
  const osimLink = computed(() => getFlawOsimLink(flaw.value.uuid));
  const isInTriageWithoutAffects = computed(() =>
    flaw.value.classification?.state === 'TRIAGE'
    && flaw.value.affects.every(affect => !affect.uuid),
  );

  function afterSaveSuccess(queue?: (() => void)[]) {
    isSaving.value = false;
    if (queue) {
      queue.forEach(fn => fn());
    }
  }

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
    // Remove any empty fields before request
    const flawForPost: any = Object.fromEntries(
      Object.entries(validatedFlaw.data).filter(([, value]) => value !== ''),
    );
    try {
      // TODO: Refactor promise chain
      await postFlaw(flawForPost)
        .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
        .then(async (response: any) => {
          flaw.value.uuid = response.uuid;
          saveDraftFlaw(flaw.value);
          if (flaw.value.acknowledgments.length > 0) {
            await flawAttributionsModel.saveAcknowledgments(flaw.value.acknowledgments);
          }
          if (flaw.value.references.length > 0) {
            await flawAttributionsModel.saveReferences(flaw.value.references);
          }
          return response;
        })
        .catch(createCatchHandler('Error creating Flaw'))
        .finally(async () => {
          if (flaw.value.uuid) {
            if (wasCvssModified.value) {
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

    if (wasCvssModified) {
      const validatedCVSS = validateCvssVector(flawRhCvss3.value.vector);
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
        afterSuccessQueue.push(() => setFlaw(response as ZodAffectType[], 'affects'));
      });
    }

    if (isFlawUpdated.value) {
      queue.push(async () => {
        const response = await putFlaw(flaw.value.uuid, validatedFlaw.data, shouldCreateJiraTask.value);
        afterSuccessQueue.push(() => setFlaw(response?.data as ZodFlawType));
      },
      );
    }
    if (wasCvssModified.value) {
      queue.push(async () => {
        const response = await saveCvssScores();
        afterSuccessQueue.push(() => setFlaw(response?.data, 'cvss_scores'));
      });
    }

    if (affectsToDelete.value.length) {
      queue.push(removeAffects);
    }

    if (!isInTriageWithoutAffects.value && wereAffectsEditedOrAdded.value) {
      queue.push(async () => {
        const response = await saveAffects();
        afterSuccessQueue.push(() => setFlaw(response as ZodAffectType[], 'affects'));
      });
    }

    if (areLabelsUpdated.value) {
      queue.push(async () => {
        const response = await updateLabels();
        if (response && Array.isArray(response)) {
          const labels = response
            .filter((result): result is PromiseFulfilledResult<{ data: any }> =>
              result.status === 'fulfilled' && result.value?.data)
            .map(result => result.value.data);
          afterSuccessQueue.push(() => setFlaw(labels as ZodFlawLabelType[], 'labels'));
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

  const errors = computed(() => flawErrors(flaw.value));

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
    ...cvssScoresModel,
    ...useFlawCommentsModel(flaw, isSaving, afterSaveSuccess),
    ...useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess),
  };
}

function flawErrors(flaw: ZodFlawType) {
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
