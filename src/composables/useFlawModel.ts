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

export type FlawEmitter = {
  (e: 'refresh:flaw'): void;
  (e: 'add-blank-affect'): void;
  (e: 'comment:add-public', value: string): void;
}

import { useToastStore } from '@/stores/ToastStore';
import { flawTypes, flawSources, flawImpacts, flawIncidentStates } from '@/types/zodFlaw';

export function useFlawModel(forFlaw: ZodFlawType = blankFlaw(), emit: FlawEmitter) {
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
    postFlaw(flaw.value)
      .then(createSuccessHandler({ title: 'Success!', body: 'Flaw created' }))
      .then((response: any) => {
        router.push({
          name: 'flaw-detail',
          params: { id: response?.uuid },
        });
      })
      .catch(createCatchHandler('Error creating Flaw'));
  }

  async function updateFlaw() {
    const newFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!newFlaw.success) {
      addToast({
        title: 'Error validating Flaw (schema error)',
        body: newFlaw.error.toString(),
        css: 'warning',
      });
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

    emit('refresh:flaw');
  }

  function addPublicComment(comment: string) {
    postFlawPublicComment(flaw.value.uuid, comment)
      .then(createSuccessHandler({ title: 'Success!', body: 'Comment saved.' }))
      .then(() => emit('refresh:flaw'))
      .catch(createCatchHandler('Error saving comment'));
  }

  return {
    flaw,
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
    emit,
    ...useCvssScoresModel(flaw),
    ...useFlawAffectsModel(flaw),
    ...useFlawAttributionsModel(flaw, emit),
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
