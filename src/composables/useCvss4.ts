/* eslint-disable unicorn/consistent-function-scoping */
import { ref, watch, computed } from 'vue';

import { map } from 'ramda';

import { CVSS40, Vector, METRICS } from '@/utils/cvss40';
import { isNonArrayObject } from '@/utils/helpers';

const deepMap = (transform: (arg: any) => any, object: Record<string, any>): any =>
  map(
    (val: any) => isNonArrayObject(val)
      ? deepMap(transform, val)
      : transform(val)
    , object,
  );

const cvss4Selections = ref(
  deepMap((value) => {
    const isArray = Array.isArray(value);
    // console.log(value, isArray);
    return isArray ? value?.[1] || value : value;
  }, METRICS,
  ),
);

console.log(cvss4Selections.value);

// const vectorString = ref('');

export function useCvss4Calculations() {
  const vectorForParse = new Vector();
  vectorForParse.updateMetricSelections(cvss4Selections.value);

  const cvss4ClassInstance = new CVSS40(vectorForParse);
  const error = computed(() => cvss4ClassInstance.error + cvss4ClassInstance.vector.error);
  const score = ref(cvss4ClassInstance.score);

  const vectorString = computed(() => cvss4ClassInstance.vector.raw);

  const selectionsFlattened = computed(() => flattenSelections(cvss4Selections.value));

  function flattenSelections(selections: Record<string, any>) {
    return Object.values(selections).reduce(
      (selections: Record<string, any>, metrics) => {
        Object.entries(metrics as Record<string, any>).forEach(([key, value]) => {
          selections[key] = value;
        });
        return selections;
      }, {} as Record<string, any>);
  }

  watch(selectionsFlattened, (selections) => {
    // vectorForParse.updateMetricSelections(selections);
    cvss4ClassInstance.vector.updateMetricSelections(selections);
    cvss4ClassInstance.updateScore();
    score.value = cvss4ClassInstance.score;
  });
  return {
    error,
    vectorString,
    score,
  };
}

export function useCvss4Selections() {
  return { cvss4Selections };
}
