import { computed, ref } from 'vue';
import { ZodFlawSchema, type ZodFlawType } from '../types/zodFlaw';
import { useRouter } from 'vue-router';
import { type Flaw } from '@/generated-client';
import { useCvssScoresModel } from '@/composables/useCvssScoresModel';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { createSuccessHandler, createCatchHandler } from './service-helpers';
import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlawPublicComment,
  postFlaw,
  putFlaw,
} from '@/services/FlawService';

export type FlawEmitter = {
    (e: 'update:flaw',  flaw: any): void
    (e: 'refresh:flaw'): void
};

import { useToastStore } from '@/stores/ToastStore';
import { flawTypes, flawSources, flawImpacts, flawIncidentStates } from '@/types/zodFlaw';

export function useFlawModel(forFlaw: Flaw = blankFlaw() as Flaw, emit: FlawEmitter) {
  const { addToast } = useToastStore();
  const flaw = ref<Flaw>(forFlaw);
  const { flawNvdCvssScore, flawRhCvss, wasCvssModified, saveCvssScores } = useCvssScoresModel(flaw);
  const {
    theAffects,
    wereAffectsModified,
    saveAffects,
    addBlankAffect,
    removeAffect,
    reportAffectAsModified,
  } = useFlawAffectsModel(flaw);

  const router = useRouter();
  const committedFlaw = ref<Flaw | null>(null);
  const addComment = ref(false);
  const newPublicComment = ref('');

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
    postFlaw(flaw.value)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
      .then((response) => {
        router.push({ name: 'flaw-detail', params: { id: response.data.uuid } });
      })
      .catch(createCatchHandler('Error creating Flaw'));
  }

  async function updateFlaw() {
    console.log(flaw.value);
    const newFlaw = ZodFlawSchema.safeParse(flaw.value);
    console.log(newFlaw);
    if (!newFlaw.success) {
      addToast({
        title: 'Error validating Flaw (schema error)',
        body: newFlaw.error.toString(),
        css: 'warning',
      });
      console.log(newFlaw.error);
      return; // Abort if schema validation fails
    }

    if (wereAffectsModified.value) {
      await saveAffects();
    }

    await putFlaw(flaw.value.uuid, newFlaw.data)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw saved' }))
      .catch(createCatchHandler('Could not update Flaw'));

    if (wasCvssModified.value) {
      await saveCvssScores();
    }

    emit('refresh:flaw');
  }

  function addPublicComment() {
    postFlawPublicComment(flaw.value.uuid, newPublicComment.value)
      .then(createSuccessHandler({ title: 'Success!', body: 'Comment saved.' }))
      .then(() => {
        newPublicComment.value = '';
        addComment.value = false;
        emit('refresh:flaw');
      })
      .catch(createCatchHandler('Error saving comment'));
  }

  return {
    flaw,
    committedFlaw,
    addComment,
    newPublicComment,
    trackerUuids,
    flawTypes,
    flawSources,
    flawImpacts,
    flawIncidentStates,
    osimLink,
    bugzillaLink,
    flawNvdCvssScore,
    flawRhCvss,
    addPublicComment,
    addBlankAffect,
    removeAffect,
    createFlaw,
    updateFlaw,
    reportAffectAsModified,
    theAffects,
    emit,
  };
}

function blankFlaw(): ZodFlawType {
  return {
    affects: [],
    classification: {
      state: 'NEW',
      workflow: '',
    },
    component: '',
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
  };
}

