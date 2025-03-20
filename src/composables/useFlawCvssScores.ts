/* _eslint-disable unicorn/consistent-function-scoping */
import { computed, ref, watch } from 'vue';

import { groupWith, equals } from 'ramda';

import { deleteFlawCvssScores, putFlawCvssScores, postFlawCvssScores } from '@/services/FlawService';
import { deepCopyFromRaw } from '@/utils/helpers';
import { IssuerEnum } from '@/generated-client';
import { CvssVersions, DEFAULT_CVSS_VERSION } from '@/constants';
import type { Nullable, ZodFlawCVSSType } from '@/types';

import { useCvss4Calculations } from './useCvss4Calculator';
import { useFlaw } from './useFlaw';

const { flaw } = useFlaw();

function useGlobals() {
  const cvssVersion = ref<string>(DEFAULT_CVSS_VERSION);

  const rhCvssScores = ref(initializedRhCvss());

  const flawRhCvss = computed(() => rhCvssScores.value[cvssVersion.value]);

  function selectedCvssData(issuer: IssuerEnum) {
    return getCvssData(issuer, cvssVersion.value);
  }

  function initializedRhCvss() {
    return Object.fromEntries(
      Object.values(CvssVersions).map(version => [
        version,
        getCvssData(IssuerEnum.Rh, version) ?? blankCvss(version)],
      ),
    );
  }

  function getCvssData(issuer: string, version: string) {
    return flaw.value.cvss_scores.find(
      cvss => (cvss.issuer === issuer && cvss.cvss_version === version)
      || cvss.issuer === issuer,
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

const { cvssVersion, flawRhCvss, initializedRhCvss, rhCvssScores, selectedCvssData } = useGlobals();
const { cvss4Vector, cvss4Score } = useCvss4Calculations();

export const issuerLabels: Record<string, string> = {
  [IssuerEnum.Nist]: 'NVD',
  [IssuerEnum.Rh]: 'RH',
  [IssuerEnum.Cveorg]: 'CVEOrg',
  [IssuerEnum.Osv]: 'OSV',
};

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
    if (flawRhCvss.value?.created_dt) {
      // Handle existing CVSS score
      if (flawRhCvss.value?.vector === null && flawRhCvss.value?.uuid != null) {
        return deleteFlawCvssScores(flaw.value.uuid, flawRhCvss.value.uuid);
      }
      // Update embargoed state from parent flaw
      flawRhCvss.value.embargoed = flaw.value.embargoed;
      return putFlawCvssScores(flaw.value.uuid, flawRhCvss.value.uuid || '', flawRhCvss.value);
    }

    // Handle newly created CVSS score
    const requestBody = {
      // "score":  is recalculated based on the vector by OSIDB and does not need to be included
      comment: flawRhCvss.value?.comment,
      cvss_version: cvssVersion.value,
      issuer: IssuerEnum.Rh,
      vector: flawRhCvss.value?.vector,
      embargoed: flaw.value.embargoed,
    };
    return postFlawCvssScores(flaw.value.uuid, requestBody);
  }

  function updateVector(vector: string) {
    flawRhCvss.value.vector = vector;
  }

  function updateScore(score: number) {
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
