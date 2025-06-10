import { computed, ref, watch } from 'vue';
import type { ComputedRef } from 'vue';

import { equals, groupWith } from 'ramda';
import { z } from 'zod';

import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlaw } from '@/composables/useFlaw';
import { useCvss4Calculator } from '@/composables/useCvss4Calculator';
import {
  parseCvss3Factors,
  calculateCvss3Score,
  formatCvss3Factors,
  useCvss3Calculator,
} from '@/composables/useCvss3Calculator';

import { matcherForAffect, deepCopyFromRaw } from '@/utils/helpers';
import { CVSS40 } from '@/utils/cvss40';
import { CvssVersionDisplayMap, CvssVersions, DEFAULT_CVSS_VERSION, CorrespondingCvssFactors } from '@/constants';
import { IssuerEnum } from '@/generated-client';
import { deleteFlawCvssScores, postFlawCvssScores, putFlawCvssScores } from '@/services/FlawService';
import type {
  Dict,
  Nullable,
  ZodAffectType,
  ZodAffectCVSSType,
  ZodFlawCVSSType,
  CvssEntity,
  Cvss,
  ZodFlawType,
} from '@/types';

const wasFlawCvssModified = ref(false);
const shouldSyncVectors = ref(false);
const cvssVersion = ref<CvssVersions>(DEFAULT_CVSS_VERSION);

function filterCvssData(issuer: string, version: string) {
  return (cvss: Cvss) => (cvss.issuer === issuer && cvss.cvss_version === version);
}

function getCvssData(entity: CvssEntity, issuer: string, version: string): Cvss | undefined {
  return entity.cvss_scores?.find(filterCvssData(issuer, version));
}

export function newAffectCvss(cvssVersion?: CvssVersions) {
  const { flaw } = useFlaw();

  return {
    // affect: z.string().uuid(),
    score: null,
    vector: null,
    comment: '',
    cvss_version: cvssVersion ?? DEFAULT_CVSS_VERSION, // TODO: change when affect CVSS4 is supported
    issuer: IssuerEnum.Rh,
    embargoed: flaw.value.embargoed,
    alerts: [],
  } as ZodAffectCVSSType;
}

function newFlawCvss(version: string = DEFAULT_CVSS_VERSION) {
  const { flaw } = useFlaw();

  return {
    score: null,
    vector: null,
    comment: '',
    cvss_version: version,
    issuer: IssuerEnum.Rh,
    embargoed: flaw.value.embargoed,
    created_dt: null,
    uuid: null,
  } as ZodFlawCVSSType;
}

export function validateCvssVector(cvssVector: null | string | undefined, version: CvssVersions) {
  if (version === CvssVersions.V3) {
    const cvss3VectorSchema = z.union([
      z.string().length(44, { message: 'Incomplete CVSS3.1 Vector. There are factors missing.' }),
      z.string().length(0).nullable(),
    ]);
    const parseResult = cvss3VectorSchema.safeParse(cvssVector);
    if (parseResult.success === false) {
      return parseResult.error.errors[0].message;
    }
  }

  if (version === CvssVersions.V4) {
    return new CVSS40(cvssVector).error || null;
  }

  return null;
}

function isAffect(maybeAffect: CvssEntity): maybeAffect is ZodAffectType {
  return 'ps_component' in maybeAffect;
}

function formatScore(score: Nullable<number>) {
  return score?.toFixed(1) ?? '';
}

export function useCvssScores(cvssEntity?: CvssEntity) {
  const { flaw } = useFlaw();

  const rhFlawCvssScores = computed(() => Object.fromEntries(
    Object.values(CvssVersions).map(version => [
      version,
      getCvssData(flaw.value, IssuerEnum.Rh, version) as ZodFlawCVSSType ?? newFlawCvss(version),
    ]),
  ));
  const { updateAffectCvss } = useFlawAffectsModel();
  const { cvss4Score, cvss4Selections, cvss4Vector, errorV4, parseVectorV4String, setMetric } = useCvss4Calculator();
  const wasCvssModified = ref(false);
  const rhCvssScores = ref(rhCvssByVersion());

  function rhCvssByVersion(): Dict<string, Cvss> {
    const entity: CvssEntity = cvssEntity ?? flaw.value;

    for (const version of Object.values(CvssVersions)) {
      if (getCvssData(entity, IssuerEnum.Rh, version)) continue;
      // Supply blank-slate CVSS objects if no scores exist
      if (isAffect(entity)) {
        (entity as ZodAffectType).cvss_scores?.push(newAffectCvss(version));
      } else {
        (entity as ZodFlawType).cvss_scores?.push(newFlawCvss(version));
      }
    }

    const object = Object.fromEntries(
      Object.values(CvssVersions).map((version) => {
        const cvss = getCvssData(entity, IssuerEnum.Rh, version);
        return [version, cvss as Cvss];
      }));
    return object;
  }

  const entity: CvssEntity = cvssEntity ?? flaw.value;
  const flawOrAffect = cvssEntity ? computed(() => cvssEntity) : flaw;

  const flawRhCvss = computed<ZodFlawCVSSType>(() => rhFlawCvssScores.value[cvssVersion.value]);

  const rhCvss = computed<Cvss>(() => rhCvssScores.value[
    // Tentatively, we are only supporting CVSS3 for affects; not clear if per-affect CVSS overrides are used widely
    isAffect(entity) ? CvssVersions.V3 : cvssVersion.value
  ]);

  const matchAffect = matcherForAffect(entity as ZodAffectType);
  const maybeAffect = flaw.value.affects.find(matchAffect);
  const maybeCvss = maybeAffect?.cvss_scores.find(filterCvssData(IssuerEnum.Rh, cvssVersion.value));

  const cvssVector = computed(() => rhCvss.value?.vector ? rhCvss.value?.vector : null);
  const cvssScore = computed(() => rhCvss.value?.score ?? null);
  const { cvss3Factors } = useCvss3Calculator(computed(() => rhCvssScores.value[CvssVersions.V3]?.vector ?? ''));

  const error = computed(() => {
    const errors = [validateCvssVector(cvssVector.value, cvssVersion.value)];
    if (cvssVersion.value === CvssVersions.V4) errors.push(errorV4.value);
    return errors.filter(Boolean).join('. ') || null;
  });

  if (isAffect(entity) && maybeAffect && !maybeCvss) {
    maybeAffect.cvss_scores.push(newAffectCvss());
  }

  const initialRhCvss = deepCopyFromRaw(rhCvss.value);

  watch(rhCvss, () => {
    wasCvssModified.value = !equals(initialRhCvss, rhCvss.value);
    if (!wasCvssModified.value) {
      if (!isAffect(entity)) {
        wasFlawCvssModified.value = false;
      };
      return;
    }
    if (!isAffect(entity)) {
      wasFlawCvssModified.value = true;
      flawRhCvss.value.score = rhCvss.value.score ?? null;
      flawRhCvss.value.vector = rhCvss.value.vector ?? null;
    } else {
      updateAffectCvss(
        entity,
        rhCvss.value.vector ?? '',
        rhCvss.value.score ?? null,
        entity.cvss_scores.findIndex(cvss => cvss.uuid == maybeCvss?.uuid),
      );
    }
    if (shouldSyncVectors.value) synchronizeFactors();
  }, { deep: true });

  watch(() => flaw.value.updated_dt, () => {
    wasFlawCvssModified.value = false;
  });

  watch(cvss3Factors, () => {
    updateUsingV3Vector(formatCvss3Factors(cvss3Factors.value));
  }, { deep: true });

  watch(() => flawOrAffect.value.updated_dt, () => {
    rhCvssScores.value = rhCvssByVersion();
    wasCvssModified.value = false;
  });

  watch(cvss4Score, (score) => {
    if (cvssVersion.value === CvssVersions.V4) updateScore(score);
  });

  watch(cvss4Vector, (vector) => {
    if (cvssVersion.value === CvssVersions.V4) updateVector(vector);
  });

  function synchronizeFactors() {
    const vector = rhCvss.value.vector || '';

    // Convert from CVSS4 to CVSS3
    if (cvssVersion.value === CvssVersions.V4) {
      const cvss4Metrics = cvss4Selections.value.BASE;
      for (const [metric, v4Value] of Object.entries(cvss4Metrics)) {
        if (metric === 'CVSS') continue;
        const factor: string = CorrespondingCvssFactors[metric] ?? metric;

        if (metric === 'UI' && v4Value !== null) {
          // CVSS3 just has N or R for UI metrics, where as CVSS4 has A, P, N for UI metrics
          cvss3Factors.value[factor] = v4Value === 'N' ? 'N' : 'R';
          continue;
        }

        if (factor in cvss3Factors.value) {
          if (cvssScore.value !== null && v4Value === null) continue;
          cvss3Factors.value[factor] = v4Value as string;
          rhCvssScores.value[CvssVersions.V3].vector = formatCvss3Factors({
            ...cvss3Factors.value, CVSS: CvssVersionDisplayMap[CvssVersions.V3],
          });
          rhCvssScores.value[CvssVersions.V3].score = calculateCvss3Score(cvss3Factors.value);
        }
      }
    }

    if (cvssVersion.value === CvssVersions.V3) {
      const factors = parseCvss3Factors(vector);
      for (const [factor, value] of Object.entries(factors)) {
        if (factor === 'CVSS' || value === '') continue;
        const correspondingMetric: string = CorrespondingCvssFactors[factor];
        if (!correspondingMetric) continue;

        // CVSS4 has 2 metrics A, P, N for UI metrics, and only a value of N can be mapped to its corresponding
        // metric factor in CVSS3; A and P would be correct translations of R, but this must be chosen by the user
        const factorValue = (factor === 'UI' && value === 'R') ? null : value;

        cvss4Selections.value['BASE'][correspondingMetric] = factorValue;
      }
      rhCvssScores.value[CvssVersions.V4].vector = cvss4Vector.value;
      rhCvssScores.value[CvssVersions.V4].score = cvss4Score.value;
    }
  }

  async function saveCvssScores() {
    const queue = [];
    for (const cvssData of Object.values(rhFlawCvssScores.value)) {
      // Update logic, if the CVSS score already exists in OSIDB
      if (cvssData.created_dt) {
        // Handle existing CVSS score
        if (cvssData.vector === null && cvssData.uuid != null) {
          queue.push(deleteFlawCvssScores(flaw.value.uuid, cvssData.uuid));
        } else if (cvssData.vector !== null && cvssData.uuid) {
          // Update embargoed state from parent flaw
          cvssData.embargoed = flaw.value.embargoed;
          queue.push(putFlawCvssScores(flaw.value.uuid, cvssData.uuid, cvssData));
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

  function updateScore(score: null | number) {
    rhCvss.value.score = score;
  }

  function updateVector(vector: null | string) {
    rhCvss.value.vector = vector;
    if (cvssVersion.value === CvssVersions.V4 && vector === null) parseVectorV4String(null);
    if (cvssVersion.value === CvssVersions.V3 && vector === null) cvss3Factors.value = {};
  }

  function updateUsingV3Vector(newCvssVector: null | string | undefined) {
    // Should this just update V3 instead of returnin if v4
    if (cvssVersion.value === CvssVersions.V4) return;

    updateVector(newCvssVector ?? '');
    const factors = parseCvss3Factors(newCvssVector ?? '');
    updateScore(calculateCvss3Score(factors) ?? 0);
  }

  function reset() {
    updateVector(null);
    updateScore(null);
  }

  return {
    updateVector,
    updateUsingV3Vector,
    updateScore,
    cvss3Factors,
    cvssVersion,
    cvssVector,
    cvss4Score,
    cvss4Selections,
    cvss4Vector,
    cvssScore,
    wasCvssModified,
    wasFlawCvssModified,
    flawRhCvss,
    rhCvss,
    reset,
    parseVectorV4String,
    saveCvssScores,
    setMetric,
    shouldSyncVectors,
    ...useFlawCvssStrings(flawRhCvss),
    error,
  };
}

function useFlawCvssStrings(flawRhCvss: ComputedRef<ZodFlawCVSSType>) {
  const { flaw } = useFlaw();

  const flawNvdCvss = computed(() => getCvssData(flaw.value, IssuerEnum.Nist, cvssVersion.value));

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
      const { score, vector } = flawRhCvss.value;
      return score + ' ' + vector;
    }
    return '-';
  });

  const shouldDisplayEmailNistForm = computed(() => {
    if (['', '-'].includes(rhCvssString.value) || ['', '-'].includes(nvdCvssString.value)) {
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

  return {
    rhCvssString,
    nvdCvssString,
    highlightedNvdCvssString,
    shouldDisplayEmailNistForm,
  };
}
