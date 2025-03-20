/* eslint-disable unicorn/consistent-function-scoping */
import { ref, watch, computed } from 'vue';

import { map } from 'ramda';

import { CVSS40, Vector, METRICS } from '@/utils/cvss40';
import { isNonArrayObject } from '@/utils/helpers';
import type { Dict } from '@/types';

const deepMap = (transform: (arg: any) => any, object: Record<string, any>): any =>
  map(
    (val: any) => isNonArrayObject(val)
      ? deepMap(transform, val)
      : transform(val)
    , object,
  );

const cvss4Selections = ref(
  deepMap(value => Array.isArray(value) ? value?.[0] || value : value, METRICS),
);

const vectorForParse = new Vector();
const cvss4ClassInstance = new CVSS40(vectorForParse);
const cvss4Score = ref(cvss4ClassInstance.score);
const cvss4Vector = ref(cvss4ClassInstance.vector.raw);

export function useCvss4Calculations() {
  vectorForParse.updateMetricSelections(cvss4Selections.value);

  const error = computed(() => cvss4ClassInstance.error + cvss4ClassInstance.vector.error);

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

  watch(selectionsFlattened, updateCvssFromSelections);

  function updateCvssFromSelections(selections: Dict<string, any>) {
    cvss4ClassInstance.vector.updateMetricSelections(selections);
    cvss4ClassInstance.updateScore();
    cvss4Score.value = cvss4ClassInstance.score;
    cvss4Vector.value = cvss4ClassInstance.vector.raw;
  }

  return {
    error,
    cvss4Vector,
    cvss4Score,
  };
}

export function useCvss4Selections() {
  return { cvss4Selections };
}
