import { computed, ref } from 'vue';

import { useRouter } from 'vue-router';
import { modifyPath } from 'ramda';
import type { ZodIssue } from 'zod';

import { useFlawCvssScores } from '@/composables/useFlawCvssScores';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlawCommentsModel } from '@/composables/useFlawCommentsModel';
import { useFlawAttributionsModel } from '@/composables/useFlawAttributionsModel';

import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlaw,
  putFlaw,
} from '@/services/FlawService';
import { useDraftFlawStore } from '@/stores/DraftFlawStore';
import { useToastStore } from '@/stores/ToastStore';
import { flawSources, flawImpacts, flawIncidentStates } from '@/types/zodFlaw';
import { deepMap } from '@/utils/helpers';
import { ZodFlawSchema, type ZodFlawType } from '@/types/zodFlaw';

import { createSuccessHandler, createCatchHandler } from './service-helpers';
import { useNetworkQueue } from './useNetworkQueue';

export function useFlawModel(forFlaw: ZodFlawType = blankFlaw(), onSaveSuccess: () => void) {
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const flaw = ref<ZodFlawType>(forFlaw);
  const shouldCreateJiraTask = ref(false);
  const cvssScoresModel = useFlawCvssScores(flaw);

  const flawAttributionsModel = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);
  const { saveCvssScores, wasCvssModified } = cvssScoresModel;
  const {
    affectsToDelete,
    didAffectsChange,
    initialAffects,
    removeAffects,
    saveAffects,
  } = useFlawAffectsModel(flaw);

  const router = useRouter();
  const committedFlaw = ref<null | ZodFlawType>(null);
  const { saveDraftFlaw } = useDraftFlawStore();

  const bugzillaLink = computed(() => getFlawBugzillaLink(flaw.value));
  const osimLink = computed(() => getFlawOsimLink(flaw.value.uuid));

  const isInTriageWithoutAffects = computed(
    () => flaw.value.classification?.state === 'TRIAGE' && initialAffects.value.length === 0,
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
    if (isInTriageWithoutAffects.value && didAffectsChange.value) {
      queue.push(saveAffects);
    }

    queue.push(putFlaw.bind(null, flaw.value.uuid, validatedFlaw.data, shouldCreateJiraTask.value));

    if (wasCvssModified.value) {
      queue.push(saveCvssScores);
    }

    if (affectsToDelete.value.length) {
      queue.push(removeAffects);
    }

    if (!isInTriageWithoutAffects.value && didAffectsChange.value) {
      queue.push(saveAffects);
    }

    try {
      await execute(...queue);
    } catch (error) {
      console.error('useFlawModel::updateFlaw() Error updating flaw:', error);
      isSaving.value = false;
      return;
    }

    afterSaveSuccess();
  }

  function afterSaveSuccess() {
    onSaveSuccess();
    isSaving.value = false;
  }

  const errors = computed(() => flawErrors(flaw.value));

  const toggleShouldCreateJiraTask = () => {
    shouldCreateJiraTask.value = !shouldCreateJiraTask.value;
  };

  return {
    flaw,
    isSaving,
    isValid,
    errors,
    committedFlaw,
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

export function blankFlaw(): ZodFlawType {
  return {
    affects: [],
    classification: {
      state: 'NEW',
      workflow: '',
    },
    components: [],
    unembargo_dt: null,
    reported_dt: new Date().toISOString(),
    uuid: '',
    cve_id: '',
    cvss_scores: [],
    cwe_id: '',
    comment_zero: '',
    embargoed: false,
    impact: '',
    major_incident_state: '',
    source: '',
    title: '',
    owner: '',
    team_id: '',
    cve_description: '',
    statement: '',
    mitigation: '',
    task_key: '',
    comments: [],
    references: [],
    acknowledgments: [],
    alerts: [],
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
