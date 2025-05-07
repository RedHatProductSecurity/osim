import { ref, watch, computed } from 'vue';

import { map } from 'ramda';

import { useFlaw } from '@/composables/useFlaw';

import { IssuerEnum } from '@/generated-client';
import { CVSS40, Vector, METRICS } from '@/utils/cvss40';
import { isNonArrayObject } from '@/utils/helpers';
import type { Dict } from '@/types';
import { CvssVersions } from '@/constants';

const { flaw } = useFlaw();

function rhCvss4_0() {
  return flaw.value.cvss_scores.find(
    cvss => cvss.issuer === IssuerEnum.Rh && cvss.cvss_version === CvssVersions.V4,
  );
}

const deepMap = (transform: (arg: any) => any, object: Record<string, any>): any =>
  map(
    (val: any) => isNonArrayObject(val)
      ? deepMap(transform, val)
      : transform(val)
    , object,
  );

export function useCvss4Calculator() {
  const vectorForParse = new Vector();
  const cvss4ClassInstance = new CVSS40(vectorForParse);
  const cvss4Score = ref(cvss4ClassInstance.score);
  const cvss4Vector = ref(cvss4ClassInstance.vector.raw);
  const cvss4Selections = ref(
    deepMap(value => Array.isArray(value) ? null : value, METRICS),
  );

  vectorForParse.updateMetricSelections(cvss4Selections.value);

  const errors = computed(() => [cvss4ClassInstance.error, cvss4ClassInstance.vector.error]);
  const error = computed(() => errors.value.length > 0 ? errors.value.join(' ') : null);

  watch(cvss4Selections, updateCvssFromSelections, { deep: true });

  watch(flaw, () => {
    const cvss4Data = rhCvss4_0();
    if (cvss4Data && cvss4Data.vector) {
      cvss4ClassInstance.vector.updateVector(cvss4Data.vector);
      updateUiSelections(cvss4ClassInstance.vector.metricsSelections);
    }
  }, { immediate: true });

  function updateUiSelections(selections: Dict<string, any>) {
    for (const [metricGroup, metrics] of Object.entries(cvss4Selections.value)) {
      for (const [metricFactor, metricValue] of Object.entries(selections)) {
        if ((metrics as Dict)[metricFactor]) {
          cvss4Selections.value[metricGroup][metricFactor] = metricValue;
        }
      }
    }
  }

  function updateCvssFromSelections(selections: Dict<string, any>) {
    cvss4ClassInstance.vector.updateMetricSelections(selections);
    updateUiSelections(selections);
    cvss4ClassInstance.updateScore();
    cvss4Score.value = cvss4ClassInstance.score;
    cvss4Vector.value = cvss4ClassInstance.vector.raw;
  }

  function setMetric(category: string, metric: string, value: string) {
    if (metric in cvss4Selections.value[category]) {
      cvss4Selections.value[category][metric] = value;
    } else {
      console.debug('🚨 Failed to set metric: ', metric, 'not in', category, '. value', value, 'not assigned');
    }
  }

  return {
    error,
    cvss4Selections,
    cvss4Score,
    cvss4Vector,
    setMetric,
  };
}
