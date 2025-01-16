import { ref } from 'vue';

import type { ZodFlawType } from '@/types/zodFlaw';

const flaw = ref<null | ZodFlawType>(blankFlaw());
const relatedFlaws = ref<ZodFlawType[]>([]);

export function initializeFlaw() {
  flaw.value = null;
  relatedFlaws.value = [];
}

export function useFlaw() {
  return flaw;
}

export function useRelatedFlaws() {
  return relatedFlaws;
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
