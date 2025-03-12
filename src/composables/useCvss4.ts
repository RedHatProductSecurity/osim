import { type Ref, ref, computed, watch } from 'vue';

import { map } from 'ramda';

import { CVSS40, METRICS } from '@/utils/cvss40';
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
    console.log(value, isArray);
    return isArray ? value?.[0] || value : value;
  }, METRICS,
  ),
);

const vectorString = ref('');
export function useCvss4Calculations() {
  const error: Ref<null | string> = ref(null);
  const computedVector = computed({
    get() {
      try {
        return new CVSS40(vectorString.value);
      } catch (e) {
        console.error(e);
        return vectorString.value;
      }
    },
    set(value) {
      try {
        return new CVSS40(value);
      } catch (e: unknown) {
        error.value = `${e}`;
      }
    },
  });

  watch(computedVector, (newVal, oldVal) => {

  });
  return {
    error,
    vectorString,
    computedVector,
  };
}

export function useCvss4Selections() {
  return { cvss4Selections };
}
