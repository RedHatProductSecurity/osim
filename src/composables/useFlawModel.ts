import { computed, ref } from 'vue';

import { useRouter } from 'vue-router';
import { type ZodIssue } from 'zod';
import { modifyPath } from 'ramda';

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
} from '@/types';
import type { DeepMapValues, DeepNullable } from '@/utils/typeHelpers';

import { createSuccessHandler, createCatchHandler } from './service-helpers';
import { useFlawLabels } from './useFlawLabels';

export function useFlawModel(onSaveSuccess: () => void) {
  const { flaw, isFlawUpdated } = useFlaw();
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
  const isInTriageWithoutAffects = computed(
    () => flaw.value.classification?.state === 'TRIAGE'
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

    isSaving.value = true;
    const validatedFlaw = validate();

    if (!validatedFlaw.success) {
      isSaving.value = false;
      return;
    }

    // If the flaw is in triage and has no affects, we need to save the affects first
    if (isInTriageWithoutAffects.value && wereAffectsEditedOrAdded.value) {
      queue.push(saveAffects);
    }

    if (isFlawUpdated.value) {
      queue.push(putFlaw.bind(null, flaw.value.uuid, validatedFlaw.data, shouldCreateJiraTask.value));
    }
    if (wasCvssModified.value) {
      queue.push(saveCvssScores);
    }

    if (affectsToDelete.value.length) {
      queue.push(removeAffects);
    }

    if (!isInTriageWithoutAffects.value && wereAffectsEditedOrAdded.value) {
      queue.push(saveAffects);
    }

    if (areLabelsUpdated.value) {
      queue.push(updateLabels);
    }

    try {
      return await execute(...queue);
    } catch (error) {
      console.error('useFlawModel::updateFlaw() Error updating flaw:', error);
      isSaving.value = false;
      return;
    } finally {
      afterSaveSuccess();
    }
  }

  function afterSaveSuccess() {
    onSaveSuccess();
    isSaving.value = false;
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
    ...cvssScoresModel,
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
