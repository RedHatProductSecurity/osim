import { ref, watch, computed } from 'vue';

import { map } from 'ramda';

import { useFlaw } from '@/composables/useFlaw';

import { IssuerEnum } from '@/generated-client';
import { CVSS40, METRICS } from '@/utils/cvss40';
import { isNonArrayObject } from '@/utils/helpers';
import type { Dict } from '@/types';
import { CvssVersions } from '@/constants';

function rhCvss4_0() {
  const { flaw } = useFlaw();

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
  const { flaw } = useFlaw();

  const cvss4Selections = ref(
    deepMap(value => Array.isArray(value) ? null : value, METRICS),
  );
  const cvss4Vector = computed(() => {
    const vector = Object.values(cvss4Selections.value).flatMap((group: any) =>
      Object.entries(group)
        .filter(([, value]) => value !== null)
        .map(([metric, value]) => `${metric}:${value}`),
    ).join('/');
    return vector.length ? `CVSS:4.0/${vector}` : null;
  });
  const cvssClass = computed(() => new CVSS40(cvss4Vector.value));
  const cvss4Score = computed(() => (cvss4Vector.value === null || errorV4.value) ? null : cvssClass.value.score);

  const errorsV4 = computed(() => {
    if (!cvss4Vector.value) return [];
    const _cvss = cvssClass.value;
    return [_cvss.error, _cvss.vector.error].filter(Boolean);
  });

  const errorV4 = computed(() => errorsV4.value.join('. ') || null);

  watch(flaw, () => {
    const cvss4Data = rhCvss4_0();
    if (cvss4Data && cvss4Data.vector) {
      parseVectorV4String(cvss4Data.vector);
    }
  }, { immediate: true });

  function parseVectorV4String(vector: null | string) {
    const parsedMetrics = vector === null
      ? null
      : Object.fromEntries(vector.split('/').map(metric => metric.split(':')));

    for (const [category, metrics] of Object.entries(cvss4Selections.value)) {
      for (const metricFactor of Object.keys((metrics as Dict))) {
        if (parsedMetrics === null) {
          cvss4Selections.value[category][metricFactor] = null;
        } else if (metricFactor in parsedMetrics) {
          cvss4Selections.value[category][metricFactor] = parsedMetrics[metricFactor];
        }
      }
    }
  }

  function setMetric(category: string, metric: string, value: null | string) {
    if (metric in cvss4Selections.value[category]) {
      const shouldToggle = cvss4Selections.value[category][metric] === value;
      cvss4Selections.value[category][metric] = shouldToggle ? null : value;
    }
  }

  return {
    errorV4,
    cvss4Selections,
    cvss4Score,
    cvss4Vector,
    parseVectorV4String,
    setMetric,
  };
}
