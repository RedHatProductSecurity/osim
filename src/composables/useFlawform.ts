import { computed, ref } from 'vue';
import { ZodFlawSchema, type ZodFlawType } from '../types/zodFlaw';

import { type Flaw } from '@/generated-client';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';
import { useCvssScores } from '@/composables/useCvssScores';
import { useFlawAffectsForm } from '@/composables/useFlawAffectsForm';
import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlawPublicComment,
  putFlaw,
} from '@/services/FlawService';

import { useToastStore } from '@/stores/ToastStore';
import { flawTypes, flawSources, flawImpacts, flawIncidentStates } from '@/types/zodFlaw';

export function useFlawForm(forFlaw: Flaw = blankFlaw() as Flaw, emit: Function) {
  const { addToast } = useToastStore();
  const flaw = ref<Flaw>(forFlaw);
  const { flawNvdCvssScore, flawRhCvss, wasCvssModified, saveCvssScores } = useCvssScores(flaw);
  const {
    theAffects,
    saveAffects,
    wereAffectsModified,
    addBlankAffect,
    removeAffect,
    reportAffectAsModified,
    // modifiedAffects,
  } = useFlawAffectsForm(flaw);

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

  async function updateFlaw() {
    if (!flaw.value) {
      return; // TODO
    }
    const newFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!newFlaw.success) {
      addToast({
        title: 'Error validating Flaw (schema error)',
        body: newFlaw.error.toString(),
      });
      return; // TODO
    }
    console.log(newFlaw.data);
    // Save Flaw, then safe Affects, then refresh
    await putFlaw(flaw.value.uuid, newFlaw.data)
      .then(() => {
        addToast({
          title: 'Info',
          body: 'Flaw Saved',
        });
        // emit('update:flaw', flaw.value);
        // refreshFlaw();
      })
      .catch((error) => {
        const displayedError = getDisplayedOsidbError(error);
        addToast({
          title: 'Error saving Flaw',
          body: displayedError,
        });
        console.log(error);
      });
      if (wereAffectsModified.value) {
        await saveAffects();
      }
      if (wasCvssModified.value) {
        await saveCvssScores();
      }
  }

  function addPublicComment() {
    postFlawPublicComment(flaw.value.uuid, newPublicComment.value)
      .then(() => {
        addToast({
          title: 'Comment saved',
          body: 'Comment saved',
        });
        newPublicComment.value = '';
        addComment.value = false;
        emit('refresh:flaw');
      })
      .catch((e) => {
        addToast({
          title: 'Error saving comment',
          body: getDisplayedOsidbError(e),
        });
      });
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
    updateFlaw,
    reportAffectAsModified,
    // saveAffects,
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
    type: '',
    owner: '',
    team_id: '',
    summary: '',
    statement: '',
    mitigation: '',
  };
}

