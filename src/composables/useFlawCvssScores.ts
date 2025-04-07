/* eslint-disable unicorn/consistent-function-scoping */
import { computed, ref, watch } from 'vue';

import { equals, groupWith } from 'ramda';
import { z } from 'zod';

import { useFlaw } from '@/composables/useFlaw';
import { useCvss4Calculator } from '@/composables/useCvss4Calculator';

import { CVSS40 } from '@/utils/cvss40';
import { CvssVersions, DEFAULT_CVSS_VERSION } from '@/constants';
import { IssuerEnum } from '@/generated-client';
import { deleteFlawCvssScores, postFlawCvssScores, putFlawCvssScores } from '@/services/FlawService';
import type { Dict, Nullable, ZodFlawCVSSType } from '@/types';
import { deepCopyFromRaw } from '@/utils/helpers';

export function validateCvssVector(cvssVector: null | string | undefined) {
  if (cvssVersion.value === CvssVersions.V3) {
    const cvss3VectorSchema = z.union([
      z.string().length(44, { message: 'Incomplete CVSS3.1 Vector. There are factors missing.' }),
      z.string().length(0).nullable(),
    ]);
    const parseResult = cvss3VectorSchema.safeParse(cvssVector);
    if (parseResult.success === false) {
      return parseResult.error.errors[0].message;
    }
  }

  if (cvssVersion.value === CvssVersions.V4) {
    return new CVSS40(cvssVector).error;
  }

  return null;
}

const { flaw } = useFlaw();

function useGlobals() {
  const cvssVersion = ref<string>(DEFAULT_CVSS_VERSION);

  const rhCvssScores = ref(initializedRhCvss());

  const flawRhCvss = computed(() => rhCvssScores.value[cvssVersion.value]);
  watch(() => flaw.value.updated_dt, () => {
    rhCvssScores.value = initializedRhCvss();
  });
  function selectedCvssData(issuer: IssuerEnum) {
    return getCvssData(issuer, cvssVersion.value);
  }

  function initializedRhCvss(): Dict<string, ZodFlawCVSSType> {
    return Object.fromEntries(
      Object.values(CvssVersions).map(version => [
        version,
        getCvssData(IssuerEnum.Rh, version) ?? blankCvss(version),
      ]),
    );
  }

  function getCvssData(issuer: string, version: string) {
    return flaw.value.cvss_scores.find(
      cvss => (cvss.issuer === issuer && cvss.cvss_version === version),
    );
  }

  function blankCvss(version: string) {
    return {
      score: null,
      vector: null,
      comment: '',
      cvss_version: version,
      issuer: IssuerEnum.Rh,
      created_dt: null,
      uuid: null,
    } as ZodFlawCVSSType;
  }

  return {
    cvssVersion,
    rhCvssScores,
    flawRhCvss,
    selectedCvssData,
    initializedRhCvss,
  };
}

export const { cvssVersion, flawRhCvss, initializedRhCvss, rhCvssScores, selectedCvssData } = useGlobals();
const { cvss4Score, cvss4Vector } = useCvss4Calculator();

const formatScore = (score: Nullable<number>) => score?.toFixed(1) ?? '';

export function useFlawCvssScores() {
  const wasCvssModified = ref(false);

  const initialFlawRhCvss = deepCopyFromRaw(flawRhCvss.value);

  watch(flawRhCvss, () => {
    wasCvssModified.value = !equals(initialFlawRhCvss, flawRhCvss.value);
  }, { deep: true });

  watch(() => flaw.value, () => {
    rhCvssScores.value = initializedRhCvss();
    wasCvssModified.value = false;
  });

  const flawNvdCvss = computed(() => selectedCvssData(IssuerEnum.Nist));

  const nvdCvssString = computed(() => {
    const values = [formatScore(flawNvdCvss.value?.score), flawNvdCvss.value?.vector].filter(Boolean);
    return values.join(' ') || '-';
  });

  const rhCvssString = computed(() => {
    if (flawRhCvss.value.cvss_version === CvssVersions.V3) {
      const values = [formatScore(flawRhCvss.value?.score), flawRhCvss.value?.vector].filter(Boolean);
      return values.join(' ');
    }
    if (flawRhCvss.value.cvss_version === CvssVersions.V4) {
      return cvss4Score.value + ' ' + cvss4Vector.value;
    }
    return '-';
  });

  const shouldDisplayEmailNistForm = computed(() => {
    if (rhCvssString.value === '' || nvdCvssString.value === '-') {
      return false;
    }
    if (flawRhCvss.value.comment) {
      return true;
    }
    return `${rhCvssString.value}` !== `${nvdCvssString.value}`;
  });

  const highlightedNvdCvssString = computed(() => {
    if (!flawNvdCvss.value?.vector
      || flawNvdCvss.value?.vector === '-'
      || !flawRhCvss.value?.vector) {
      return [[{ char: '-', isHighlighted: false }]];
    }

    const result = [];
    const nvdCvssValue = flawNvdCvss.value?.vector || '-';
    const cvssValue = flawRhCvss.value?.vector || '-';
    const maxLength = Math.max(nvdCvssValue.length, cvssValue.length);

    if (formatScore(flawNvdCvss.value?.score) !== formatScore(flawRhCvss.value?.score)) {
      result.push(
        { char: formatScore(flawNvdCvss.value?.score), isHighlighted: true },
        { char: ' ', isHighlighted: false },
      );
    }

    for (let i = 0; i < maxLength; i++) {
      const charFromFlaw = i < nvdCvssValue.length ? nvdCvssValue[i] : '';
      const charFromCvss = i < cvssValue.length ? cvssValue[i] : '';
      result.push({
        char: charFromFlaw,
        isHighlighted: shouldDisplayEmailNistForm.value && charFromFlaw !== charFromCvss,
      });
    }

    return groupWith((a, b) => a.isHighlighted === b.isHighlighted, result);
  });

  async function saveCvssScores() {
    const queue = [];
    for (const cvssData of Object.values(rhCvssScores.value)) {
      // Update logic, if the CVSS score already exists in OSIDB
      if (cvssData.created_dt) {
      // Handle existing CVSS score
        if (cvssData.vector === null && cvssData.uuid != null) {
          queue.push(deleteFlawCvssScores(flaw.value.uuid, cvssData.uuid));
        } else if (cvssData.vector !== null) {
          // Update embargoed state from parent flaw
          cvssData.embargoed = flaw.value.embargoed;
          queue.push(putFlawCvssScores(flaw.value.uuid, cvssData.uuid || '', cvssData));
        }
      // Handle new CVSS score, since it does not exist in OSIDB yet
      } else if (cvssData.vector !== null) {
        const requestBody = {
          // "score":  is recalculated based on the vector by OSIDB and does not need to be included
          comment: cvssData.comment,
          cvss_version: cvssData.cvss_version,
          issuer: IssuerEnum.Rh,
          vector: cvssData.vector,
          embargoed: flaw.value.embargoed,
        };
        queue.push(postFlawCvssScores(flaw.value.uuid, requestBody));
      }
      // Handle newly created CVSS score
    }

    return Promise.all(queue);
  }

  function updateVector(vector: null | string) {
    flawRhCvss.value.vector = vector;
  }

  function updateScore(score: null | number) {
    flawRhCvss.value.score = score;
  }

  return {
    updateVector,
    updateScore,
    cvssVersion,
    cvssVector: computed(() => flawRhCvss.value.vector),
    cvssScore: computed(() => flawRhCvss.value.score),
    wasCvssModified,
    rhCvssString,
    flawRhCvss,
    nvdCvssString,
    highlightedNvdCvssString,
    shouldDisplayEmailNistForm,
    saveCvssScores,
  };
}
