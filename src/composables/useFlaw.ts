import { ref } from 'vue';

import type { ZodFlawType } from '@/types/zodFlaw';

const flaw = ref<ZodFlawType>(blankFlaw());
const relatedFlaws = ref<ZodFlawType[]>([]);

function resetFlaw() {
  flaw.value = blankFlaw();
  relatedFlaws.value = [];
}

export function useFlaw() {
  return { flaw, relatedFlaws, blankFlaw, resetFlaw };
}

function blankFlaw(): ZodFlawType {
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
    impact: null,
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
