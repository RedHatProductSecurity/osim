import { computed, ref } from 'vue';
import { ZodFlawSchema, type ZodFlawType } from '@/types/zodFlaw';
import { useRouter } from 'vue-router';
import { useFlawCvssScores } from '@/composables/useFlawCvssScores';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlawAttributionsModel } from '@/composables/useFlawAttributionsModel';
import { createSuccessHandler, createCatchHandler } from './service-helpers';
import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlawComment,
  postFlaw,
  putFlaw,
} from '@/services/FlawService';

import { useDraftFlawStore } from '@/stores/DraftFlawStore';
import { useToastStore } from '@/stores/ToastStore';
import { flawSources, flawImpacts, flawIncidentStates } from '@/types/zodFlaw';
import { modifyPath } from 'ramda';
import { deepMap } from '@/utils/helpers';
import type { ZodIssue } from 'zod';
import { useNetworkQueue } from './useNetworkQueue';

export function useFlawModel(forFlaw: ZodFlawType = blankFlaw(), onSaveSuccess: () => void) {
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const flaw = ref<ZodFlawType>(forFlaw);
  const cvssScoresModel = useFlawCvssScores(flaw);
  const flawAffectsModel = useFlawAffectsModel(flaw);
  const flawAttributionsModel = useFlawAttributionsModel(flaw, isSaving, afterSaveSuccess);
  const { wasCvssModified, saveCvssScores } = cvssScoresModel;
  const { affectsToSave, saveAffects, removeAffects, affectsToDelete } = flawAffectsModel;

  const router = useRouter();
  const committedFlaw = ref<ZodFlawType | null>(null);
  const { saveDraftFlaw } = useDraftFlawStore();

  const trackersDisplay = computed(() => {
    return (flaw.value.affects ?? [])
      .flatMap((affect: any) => affect.trackers ?? [])
      .flatMap((tracker: any) => ({
        uuid: tracker.uuid,
        type: tracker.type,
        external_system_id: tracker.external_system_id,
        display: tracker.type + ' ' + tracker.external_system_id,
      }));
  });
  const bugzillaLink = computed(() => getFlawBugzillaLink(flaw.value));
  const osimLink = computed(() => getFlawOsimLink(flaw.value.uuid));

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
      Object.entries(validatedFlaw.data).filter(([, value]) => value !== '')
    );
    try {
      await postFlaw(flawForPost)
        .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
        .then(async (response: any) => {
          router.push({
            name: 'flaw-details',
            params: { id: response?.cve_id || response?.uuid },
          });
          flaw.value.uuid = response.uuid;
          saveDraftFlaw(flaw.value);
          if (flaw.value.acknowledgments.length > 0) {
            await flawAttributionsModel.saveAcknowledgments(flaw.value.acknowledgments);
          }
          if (flaw.value.references.length > 0) {
            await flawAttributionsModel.saveReferences(flaw.value.references);
          }
        })
        .catch(createCatchHandler('Error creating Flaw'));

      // Catch above will throw another error if the flaw is not created
      if (wasCvssModified.value) {
        await saveCvssScores()
          .catch(createCatchHandler('Error saving CVSS scores after creating Flaw'));
      }
    } catch (error) {
      console.error('Error when saving flaw:', error);
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
    const queue: Array<() => Promise<any>> = [];

    isSaving.value = true;
    const validatedFlaw = validate();

    if (!validatedFlaw.success) {
      isSaving.value = false;
      return;
    }

    if (affectsToSave.value.length) {
      queue.push(saveAffects);
    }

    if (affectsToDelete.value.length) {
      queue.push(removeAffects);
    }

    if (wasCvssModified.value) {
      queue.push(saveCvssScores);
    }

    queue.push(putFlaw.bind(null, flaw.value.uuid, validatedFlaw.data));

    try {
      await execute(...queue);
    } catch (error) {
      console.error('Error updating flaw:', error);
      isSaving.value = false;
      return;
    }

    afterSaveSuccess();
  }

  function afterSaveSuccess() {
    onSaveSuccess();
    isSaving.value = false;
  }

  function addFlawComment(comment: string, creator: string, isPrivate: boolean) {
    isSaving.value = true;
    const type = isPrivate ? 'Private' : 'Public';
    postFlawComment(flaw.value.uuid, comment, creator, isPrivate, flaw.value.embargoed)
      .then(createSuccessHandler({ title: 'Success!', body: `${type} comment saved.` }))
      .then(afterSaveSuccess)
      .catch(createCatchHandler('Error saving public comment'))
      .finally(() => isSaving.value = false);
  }

  const errors = computed(() => flawErrors(flaw.value));

  return {
    flaw,
    isSaving,
    isValid,
    errors,
    committedFlaw,
    trackersDisplay,
    flawSources,
    flawImpacts,
    flawIncidentStates,
    osimLink,
    bugzillaLink,
    addFlawComment,
    createFlaw,
    updateFlaw,
    afterSaveSuccess,
    ...cvssScoresModel,
    ...flawAffectsModel,
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
    .map(({ path, message }) => ({ path, message }))
    .forEach(({ path, message }) => {
      mirroredFlaw = modifyPath(path, () => message, mirroredFlaw);
    });

  return mirroredFlaw;
}
