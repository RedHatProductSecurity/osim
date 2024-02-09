import { computed, ref, toRef, defineEmits } from 'vue';
import { ZodFlawSchema, type ZodFlawType } from '../types/zodFlaw';

import { FlawType, type Flaw, type Affect } from '@/generated-client';
import { postAffect, putAffect } from '@/services/AffectService';
import { getDisplayedOsidbError } from '@/services/OsidbAuthService';

import {
  getFlawBugzillaLink,
  getFlawOsimLink,
  postFlawPublicComment,
  putFlaw,
  putFlawCvssScores,
  postFlawCvssScores,
} from '@/services/FlawService';

const emit = defineEmits<{
  // 'update:flaw': [flaw: any];
  'update:flaw': [flaw: Flaw];
  'refresh:flaw': [];
}>();

import { useToastStore } from '@/stores/ToastStore';


const flawTypes = Object.values(ZodFlawSchema.shape.type.unwrap().unwrap().enum) as string[];
const flawSources = Object.values(ZodFlawSchema.shape.source.unwrap().unwrap().enum) as string[];
const flawImpacts = Object.values(ZodFlawSchema.shape.impact.unwrap().unwrap().enum) as string[];
const incidentStates = Object.values(
  ZodFlawSchema.shape.major_incident_state.unwrap().unwrap().enum
  ) as string[];
  
  export function useFlawForm(forFlaw: Flaw) {
  const { addToast } = useToastStore();
  // {emit}: {emit: (event: string, ...args: any[])})
  const flaw = ref<Flaw | ZodFlawType | ZodFlawType>(forFlaw);
  const committedFlaw = ref<Flaw | null>(null);
  const theAffects = toRef(flaw.value, 'affects');
  const addComment = ref(false);
  const newPublicComment = ref('');

  const trackerUuids = computed(() => {
    return (flaw.value.affects ?? [])
      .flatMap((affect: any) => {
        return affect.trackers ?? [];
      })
      .flatMap((tracker: any) => {
        return {
          uuid: tracker.uuid,
          display: tracker.type + ' ' + tracker.external_system_id,
        };
      });
  });
  const bugzillaLink = computed(() => getFlawBugzillaLink(flaw.value));
  const osimLink = computed(() => getFlawOsimLink(flaw.value.uuid));
  const flawCvssScore = computed(() => flaw.value.cvss_scores[0]);

  function updateFlaw() {
    if (!flaw.value) {
      return; // TODO
    }
    const newFlaw = ZodFlawSchema.safeParse(flaw.value);
    if (!newFlaw.success) {
      addToast({
        title: 'Error saving Flaw',
        body: newFlaw.error.toString(),
      });
      return; // TODO
    }
    let flawSaved = false;
    console.log(newFlaw.data);
    // Save Flaw, then safe Affects, then refresh
    putFlaw(flaw.value.uuid, newFlaw.data)
      .then(() => {
        flawSaved = true;
        console.log('saved flaw', flaw);
      })
      .then(() => {
        if (flawSaved) {
          addToast({
            title: 'Info',
            body: 'Flaw Saved',
          });
          // emit('update:flaw', flaw.value);
          // refreshFlaw();
        }
      })
      .catch((error) => {
        const displayedError = getDisplayedOsidbError(error);
        addToast({
          title: 'Error saving Flaw',
          body: displayedError,
        });
        console.log(error);
      });
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

  function addBlankAffect() {
    theAffects.value.push({} as Affect);
  }

  function removeAffect(affectIdx: number) {
    theAffects.value.splice(affectIdx, 1);
  }

  function saveCvssScores() {
    if (flawCvssScore.value.created_dt) {
      putFlawCvssScores(
        flaw.value.uuid,
        flawCvssScore.value.uuid || '',
        flawCvssScore.value as unknown
      )
        .then((response) => {
          console.log('saved flawCvssScores', response);
          addToast({
            title: 'Success!',
            body: 'Saved CVSS Scores',
            css: 'success',
          });
        })
        .catch((error) => {
          const displayedError = getDisplayedOsidbError(error);
          addToast({
            title: 'Error updating Flaw CVSS data',
            body: displayedError,
            css: 'warning',
          });
          console.log(error);
        });
    } else {
      const requestBody = {
        comment: flawCvssScore.value.comment,
        cvss_version: 'V3',
        issuer: 'RH',
        // "score": flawCvssScore.value.score,
        vector: flawCvssScore.value.vector,
        embargoed: flaw.value.embargoed,
      };
      postFlawCvssScores(flaw.value.uuid, requestBody as unknown)
        .then((response) => {
          console.log('saved flawCvssScores', response);
          addToast({
            title: 'Success!',
            body: 'Saved CVSS Scores',
            css: 'success',
          });
        })
        .catch((error) => {
          const displayedError = getDisplayedOsidbError(error);
          addToast({
            title: 'Error creating Flaw CVSS data',
            body: displayedError,
            css: 'warning',
          });
          console.log(error);
        });
    }
  }

  const saveAffects = async () => {
    if (!flaw.value?.affects?.length) {
      return; // TODO
    }
    for (let affect of flaw.value?.affects) {
      console.log('saving the affect', affect);
      console.log(affect.uuid);
      const newAffect = {
        flaw: flaw.value?.uuid,
        type: affect.type,
        affectedness: affect.affectedness,
        resolution: affect.resolution,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
        impact: affect.impact,
        embargoed: affect.embargoed || false,
        updated_dt: affect.updated_dt,
      };
      if (affect.uuid != null) {
        await putAffect(affect.uuid, newAffect)
          .then(() => {
            console.log('saved newAffect', newAffect);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${newAffect.ps_component}`,
            });
          })
          .catch((error) => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          });
      } else {
        await postAffect(newAffect)
          .then(() => {
            console.log('saved newAffect', newAffect);
            addToast({
              title: 'Info',
              body: `Affect Saved: ${newAffect.ps_component}`,
            });
          })
          .catch((error) => {
            const displayedError = getDisplayedOsidbError(error);
            addToast({
              title: 'Error saving Affect',
              body: displayedError,
            });
            console.log(error);
          });
      }
    }
    // refreshFlaw();
  };

  return {
    flaw,
    committedFlaw,
    addComment,
    newPublicComment,
    trackerUuids,
    flawTypes,
    flawSources,
    flawImpacts,
    incidentStates,
    osimLink,
    bugzillaLink,
    flawCvssScore,
    addPublicComment,
    addBlankAffect,
    removeAffect,
    updateFlaw,
    saveAffects,
    theAffects,
    emit
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

