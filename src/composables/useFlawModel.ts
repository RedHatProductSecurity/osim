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
  postFlawPublicComment,
  postFlaw,
  putFlaw,
} from '@/services/FlawService';

import { useToastStore } from '@/stores/ToastStore';
import { flawTypes, flawSources, flawImpacts, flawIncidentStates } from '@/types/zodFlaw';
import { modifyPath } from 'ramda';
import { deepMap } from '@/utils/helpers';
import type { ZodIssue } from 'zod';
import { useNetworkQueue } from './useNetworkQueue';

export function useFlawModel(forFlaw: ZodFlawType = blankFlaw(), onSaveSuccess: () => void){
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const flaw = ref<ZodFlawType>(forFlaw);
  const cvssScoresModel = useFlawCvssScores(flaw);
  const flawAffectsModel = useFlawAffectsModel(flaw);
  const { wasCvssModified, saveCvssScores } = cvssScoresModel;
  const { affectsToSave, saveAffects, deleteAffects, affectsToDelete } = flawAffectsModel;

  const router = useRouter();
  const committedFlaw = ref<ZodFlawType | null>(null);

  const trackerUuids = computed(() => {
    return (flaw.value.affects ?? [])
      .flatMap((affect: any) => affect.trackers ?? [])
      .flatMap((tracker: any) => ({
        uuid: tracker.uuid,
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

    await postFlaw(flawForPost)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
      .then((response: any) => {
        router.push({
          name: 'flaw-details',
          params: { id: response?.cve_id || response?.uuid },
        });
        flaw.value.uuid = response.uuid;
      })
      .catch(createCatchHandler('Error creating Flaw'));

    if (wasCvssModified.value) {
      await saveCvssScores();
    }
    isSaving.value = false;
  }

  function validate(){
    const validatedFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!validatedFlaw.success) {

      const temporaryFieldRenaming = (fieldName: string | number) =>
        fieldName === 'description' ? 'Comment#0' : fieldName;

      const errorMessage = ({ message, path }: ZodIssue) => `${path.map(temporaryFieldRenaming).join('/')}: ${message}`;

      addToast({
        title: 'Flaw validation failed before submission',
        body: validatedFlaw.error.issues.map(errorMessage).join('\n '),
        css: 'warning',
      });
      console.log(validatedFlaw.error);
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
      queue.push(deleteAffects);
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

  function addPublicComment(comment: string) {
    isSaving.value = true;
    postFlawPublicComment(flaw.value.uuid, comment, flaw.value.embargoed)
      .then(createSuccessHandler({ title: 'Success!', body: 'Comment saved.' }))
      .then(afterSaveSuccess)
      .catch(createCatchHandler('Error saving comment'))
      .finally(() => isSaving.value = false);
  }

  const errors = computed(() => flawErrors(flaw.value));


  return {
    flaw,
    isSaving,
    isValid,
    errors,
    committedFlaw,
    trackerUuids,
    flawTypes,
    flawSources,
    flawImpacts,
    flawIncidentStates,
    osimLink,
    bugzillaLink,
    addPublicComment,
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
    component: '',
    unembargo_dt: '',
    reported_dt: new Date().toISOString(),
    uuid: '',
    cve_id: '',
    cvss3: '',
    cvss_scores: [],
    cwe_id: '',
    description: '',
    embargoed: false,
    impact: '',
    major_incident_state: '',
    meta: [],
    nvd_cvss3: '',
    source: '',
    title: '',
    type: 'VULNERABILITY', // OSIDB only supports Vulnerabilities at present
    owner: '',
    team_id: '',
    summary: '',
    statement: '',
    mitigation: '',
    comments: [],
    references: [],
    acknowledgments: [],
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
