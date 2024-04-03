import { putFlawCvssScores, postFlawCvssScores } from '@/services/FlawService';
import { createSuccessHandler, createCatchHandler } from './service-helpers';
import { computed, ref, watch, type Ref } from 'vue';
import type { ZodFlawType } from '@/types/zodFlaw';

const onSucceed = createSuccessHandler({ title: 'Success!', body: 'Saved CVSS Scores' });
const onError = createCatchHandler('Error updating Flaw CVSS data');

export function useCvssScoresModel(flaw: Ref<ZodFlawType>) {
  const wasCvssModified = ref(false);
  const redHatCvssData = flaw.value.cvss_scores.find((assessment) => assessment.issuer === 'RH');
  const flawRhCvss = ref(
    redHatCvssData || {
      vector: null,
      uuid: null,
      issuer: null,
      comment: null,
      created_dt: null,
      score: null,
    }, // empty for creating a flaw, or if no CVSS data exists
  );

  watch(flawRhCvss, () => (wasCvssModified.value = true), { deep: true });

  const nistCvssScore = computed(() =>
    flaw.value.cvss_scores.find((score) => score.issuer === 'NIST'),
  );

  const nvdCvssString = computed(() => {
    const values = [nistCvssScore.value?.score, nistCvssScore.value?.vector].filter(Boolean);
    return values.join('/') || flaw.value.nvd_cvss3 || '-';
  });

  const cvssString = computed(() => {
    const values = [flawRhCvss.value?.score, flawRhCvss.value?.vector].filter(Boolean);
    return values.join('/');
  });

  const shouldDisplayEmailNistForm = computed(() => {
    if(cvssString.value === '' || nvdCvssString.value === '-') {
      return false;
    }
    return `${cvssString.value}` !== `${nvdCvssString.value}`;
  });

  const highlightedNvdCvssScore = computed(() => {
    const result = [];
    const nvdCvssValue = nvdCvssString.value;
    const cvssValue = cvssString.value;
    const maxLength = Math.max(nvdCvssValue.length, cvssValue.length);

    for (let i = 0; i < maxLength; i++) {
      const charFromFlaw = i < nvdCvssValue.length ? nvdCvssValue[i] : '';
      const charFromCvss = i < cvssValue.length ? cvssValue[i] : '';
      result.push({ 
        char: charFromFlaw, 
        isHighlighted: shouldDisplayEmailNistForm.value && charFromFlaw !== charFromCvss,
      });
    }

    return result;
  });

  async function saveCvssScores() {
    if (flawRhCvss.value.created_dt) {
      return putFlawCvssScores(
        flaw.value.uuid,
        flawRhCvss.value.uuid || '',
        flawRhCvss.value as unknown,
      )
        .then(onSucceed)
        .catch(onError);
    }

    const requestBody = {
      // "score":  is recalculated based on the vector by OSIDB and does not need to be included
      comment: flawRhCvss.value.comment,
      cvss_version: 'V3',
      issuer: 'RH',
      vector: flawRhCvss.value.vector,
      embargoed: flaw.value.embargoed,
    };
    return postFlawCvssScores(flaw.value.uuid, requestBody as unknown)
      .then(onSucceed)
      .catch(onError);
  }

  return {
    wasCvssModified,
    flawRhCvss,
    shouldDisplayEmailNistForm,
    highlightedNvdCvssScore,
    cvssString,
    nvdCvssString,
    saveCvssScores,
  };
}
