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

export function useFlawModel(forFlaw: ZodFlawType = blankFlaw(), onSaveSuccess: () => void){
  const isSaving = ref(false);
  const { addToast } = useToastStore();
  const flaw = ref<ZodFlawType>(forFlaw);
  const { wasCvssModified, saveCvssScores } = useCvssScoresModel(flaw);
  const { wereAffectsModified, saveAffects, deleteAffects, affectsToDelete } =
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
    postFlaw(flaw.value)
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

  async function updateFlaw() {
    isSaving.value = true;
    const newFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!newFlaw.success) {
      addToast({
        title: 'Error validating Flaw (schema error)',
        body: newFlaw.error.toString(),
        css: 'warning',
      });
      isSaving.value = false;
      console.error(newFlaw.error);
      return; // Abort if schema validation fails
    }

    if (wereAffectsModified.value) {
      await saveAffects();
    }

    if (affectsToDelete.value.length) {
      await deleteAffects();
    }

    await putFlaw(flaw.value.uuid, newFlaw.data)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw saved' }))
      .catch(createCatchHandler('Could not update Flaw'));

    if (wasCvssModified.value) {
      await saveCvssScores();
    }

    onSaveSuccess();
    isSaving.value = false;
  }

  function addPublicComment(comment: string) {
    postFlawPublicComment(flaw.value.uuid, comment)
      .then(createSuccessHandler({ title: 'Success!', body: 'Comment saved.' }))
      .then(onSaveSuccess)
      .catch(createCatchHandler('Error saving comment'));
  }

  return {
    flaw,
    isSaving,
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
