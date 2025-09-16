import { ref, readonly, computed } from 'vue';

import type { ZodFlawCVSSType, ZodFlawLabelType, ZodFlawType } from '@/types/zodFlaw';
import { deepCopyFromRaw, serializeWithExclude } from '@/utils/helpers';
import type { ZodAffectType } from '@/types';

const flaw = ref<ZodFlawType>(blankFlaw());
const initialFlaw = ref<ZodFlawType>(blankFlaw());
const relatedFlaws = ref<ZodFlawType[]>([]);

function resetFlaw() {
  flaw.value = blankFlaw();
  initialFlaw.value = blankFlaw();
  relatedFlaws.value = [];
}

type FlawDataType = RelatedDataType | ZodFlawType;
type RelatedDataType = ZodAffectType[] | ZodFlawCVSSType[] | ZodFlawLabelType[];
type FlawFieldsWithEndpoints = 'affects' | 'cvss_scores' | 'labels';
function setFlaw(flawData: FlawDataType, key?: FlawFieldsWithEndpoints, replace: boolean = true) {
  if (!key) {
    flaw.value = flawData as ZodFlawType;
  } else if (replace) {
    Object.assign(flaw.value, { [key]: flawData });
  } else {
    (flawData as RelatedDataType).forEach((item, index) => {
      if (item.uuid && item.uuid === flaw.value[key]?.[index].uuid) {
        flaw.value[key]![index] = item;
      }
    });
  }
  initialFlaw.value = deepCopyFromRaw(flaw.value);
}

const isFlawUpdated = computed(
  () => {
    const keysToExclude: Array<keyof ZodFlawType> = ['affects', 'trackers', 'cvss_scores'];
    return serializeWithExclude(flaw.value, keysToExclude)
      !== serializeWithExclude(initialFlaw.value, keysToExclude);
  },
);

export function useFlaw() {
  return {
    flaw,
    initialFlaw: readonly(initialFlaw),
    isFlawUpdated,
    relatedFlaws,
    resetFlaw,
    setFlaw,
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
    labels: [],
    references: [],
    acknowledgments: [],
    alerts: [],
  };
}
