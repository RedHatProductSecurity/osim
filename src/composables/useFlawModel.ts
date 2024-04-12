import { computed, ref } from 'vue';
import { ZodFlawSchema, type ZodFlawType } from '@/types/zodFlaw';
import { useRouter } from 'vue-router';
import { useCvssScoresModel } from '@/composables/useCvssScoresModel';
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

export function useFlawModel(forFlaw: ZodFlawType = blankFlaw(), onSaveSuccess: () => void){
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const flaw = ref<ZodFlawType>(forFlaw);
  const { wasCvssModified, saveCvssScores } = useCvssScoresModel(flaw);
  const { affectsToSave, saveAffects, deleteAffects, affectsToDelete } =
    useFlawAffectsModel(flaw);

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

  async function createFlaw() {
    isSaving.value = true;
    const validatedFlaw = validate();
    if (!validatedFlaw.success) {
      return;
    }
    postFlaw(validatedFlaw.data)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
      .then((response: any) => {
        router.push({
          name: 'flaw-details',
          params: { id: response?.cve_id || response?.uuid },
        });
      })
      .catch(createCatchHandler('Error creating Flaw'))
      .finally(() => { isSaving.value = false; });
  }

  function validate(){
    const validatedFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!validatedFlaw.success) {
      console.log(validatedFlaw.error.issues);
      const errorMessage = ({ message, path }: ZodIssue) => `${path.join('/')}: ${message}`;
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
    const validatedFlaw = validate();
    if (!validatedFlaw.success) {
      return;
    }

    if (affectsToSave.value.length) {
      await saveAffects();
    }

    if (affectsToDelete.value.length) {
      await deleteAffects();
    }

    await putFlaw(flaw.value.uuid, validatedFlaw.data)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw saved' }))
      .catch(createCatchHandler('Could not update Flaw'));

    if (wasCvssModified.value) {
      await saveCvssScores();
    }

    onSaveSuccess();
    isSaving.value = false;
  }

  function addPublicComment(comment: string) {
    postFlawPublicComment(flaw.value.uuid, comment, flaw.value.embargoed)
      .then(createSuccessHandler({ title: 'Success!', body: 'Comment saved.' }))
      .then(onSaveSuccess)
      .catch(createCatchHandler('Error saving comment'));
  }

  const errors = computed(() => flawErrors(flaw.value));

  return {
    flaw,
    isSaving,
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
    onSaveSuccess,
    ...useCvssScoresModel(flaw),
    ...useFlawAffectsModel(flaw),
    ...useFlawAttributionsModel(flaw, onSaveSuccess),
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
