import { computed, ref, watch, toValue } from 'vue';
import type { ComputedRef } from 'vue';

import { equals, groupWith } from 'ramda';
import { z } from 'zod';

import { useFlaw } from '@/composables/useFlaw';
import { useCvss4Calculator } from '@/composables/useCvss4Calculator';

import { matcherForAffect, deepCopyFromRaw } from '@/utils/helpers';
import { CVSS40 } from '@/utils/cvss40';
import { CvssVersions, DEFAULT_CVSS_VERSION } from '@/constants';
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
} from '@/types';

function filterCvssData(issuer: string, version: string) {
  return (cvss: Cvss) => (cvss.issuer === issuer && cvss.cvss_version === version);
}

function getCvssData(entity: CvssEntity, issuer: string, version: string): Cvss | undefined {
  return entity.cvss_scores?.find(filterCvssData(issuer, version));
}

export function newAffectCvss(isEmbargoed: boolean, cvssVersion?: CvssVersions) {
  return {
    // affect: z.string().uuid(),
    score: null,
    vector: null,
    comment: '',
    cvss_version: cvssVersion ?? DEFAULT_CVSS_VERSION,
    issuer: IssuerEnum.Rh,
    embargoed: isEmbargoed,
    alerts: [],
  } as ZodAffectCVSSType;
}

function newFlawCvss(version: string = DEFAULT_CVSS_VERSION) {
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
    return new CVSS40(cvssVector).error;
  }

  return null;
}

const { flaw } = useFlaw();

const cvssVersion = ref<CvssVersions>(DEFAULT_CVSS_VERSION);

// const affectCvssScores = computed(() => {
//   const scores = flaw.value.affects.flatMap(affect => affect.cvss_scores ?? []);
//   return scores.filter(filterCvssData(IssuerEnum.Rh, cvssVersion.value));
// });

function isAffect(maybeAffect: CvssEntity): maybeAffect is ZodAffectType {
  return 'flaw' in maybeAffect;
}

const formatScore = (score: Nullable<number>) => score?.toFixed(1) ?? '';

export function useFlawCvssScores(cvssEntity?: CvssEntity) {
  function rhFlawCvssByVersion(): Dict<string, ZodFlawCVSSType> {
    return Object.fromEntries(
      Object.values(CvssVersions).map(version => [
        version,
        getCvssData(flaw.value, IssuerEnum.Rh, version) as ZodFlawCVSSType ?? newFlawCvss(version),
      ]),
    );
  }

  function rhCvssByVersion(): Dict<string, Cvss> {
    const entity: CvssEntity = cvssEntity ?? flaw.value;
    return Object.fromEntries(
      Object.values(CvssVersions).map(version => [
        version,
        getCvssData(toValue(entity), IssuerEnum.Rh, version)
        ?? isAffect(entity)
          ? newAffectCvss(flaw.value.embargoed, version)
          : newFlawCvss(version),
      ]),
    );
  }

  const entity: CvssEntity = cvssEntity ?? flaw.value;

  const rhFlawCvssScores = ref(rhFlawCvssByVersion());
  const rhCvssScores = ref(rhCvssByVersion());

  const flawOrAffect = cvssEntity ? computed(() => cvssEntity) : flaw;
  const flawOrAffectCvss = computed(() => flawOrAffect.value.cvss_scores.find(
    filterCvssData(IssuerEnum.Rh, cvssVersion.value)));

  const flawRhCvss = computed<ZodFlawCVSSType>(() => rhFlawCvssScores.value[cvssVersion.value]);
  const rhCvss = computed<Cvss>(() => rhCvssScores.value[cvssVersion.value]);

  const wasCvssModified = ref(false);

  const matchAffect = matcherForAffect(entity as ZodAffectType);
  const maybeAffect = flaw.value.affects.find(matchAffect);
  const maybeCvss = maybeAffect?.cvss_scores.find(filterCvssData(IssuerEnum.Rh, cvssVersion.value));
  if (entity.uuid !== flaw.value.uuid && maybeAffect && !maybeCvss) {
    maybeAffect.cvss_scores.push(newAffectCvss(flaw.value.embargoed));
  }

  const initialFlawRhCvss = deepCopyFromRaw(flawRhCvss.value);
  const initialRhCvss = deepCopyFromRaw(rhCvss.value);

  // watch(flawRhCvss, () => {
  //   wasCvssModified.value = !equals(initialFlawRhCvss, flawRhCvss.value);
  //   console.log('flaw changee');
  // }, { deep: true });

  // may not be needed since this is handled in flawaffects model?
  watch(rhCvss, () => {
    wasCvssModified.value = !equals(initialRhCvss, rhCvss.value);
    console.log('changee');
  }, { deep: true });

  watch(() => flaw.value, () => {
    // rhFlawCvssScores.value = rhFlawCvssByVersion();
    rhCvssScores.value = rhCvssByVersion();
    wasCvssModified.value = false;
  });

  watch(() => flawOrAffect.value.updated_dt, () => {
    rhCvssScores.value = rhCvssByVersion();
  });

  // const flawNvdCvss = computed(() => getCvssData(flaw.value, IssuerEnum.Nist, cvssVersion.value));

  // const nvdCvssString = computed(() => {
  //   const values = [formatScore(flawNvdCvss.value?.score), flawNvdCvss.value?.vector].filter(Boolean);
  //   return values.join(' ') || '-';
  // });

  // const rhCvssString = computed(() => {
  //   if (flawRhCvss.value.cvss_version === CvssVersions.V3) {
  //     const values = [formatScore(flawRhCvss.value?.score), flawRhCvss.value?.vector].filter(Boolean);
  //     return values.join(' ');
  //   }
  //   if (flawRhCvss.value.cvss_version === CvssVersions.V4) {
  //     return cvss4Score.value + ' ' + cvss4Vector.value;
  //   }
  //   return '-';
  // });

  // const shouldDisplayEmailNistForm = computed(() => {
  //   if (rhCvssString.value === '' || nvdCvssString.value === '-') {
  //     return false;
  //   }
  //   if (flawRhCvss.value.comment) {
  //     return true;
  //   }
  //   return `${rhCvssString.value}` !== `${nvdCvssString.value}`;
  // });

  // const highlightedNvdCvssString = computed(() => {
  //   if (!flawNvdCvss.value?.vector
  //     || flawNvdCvss.value?.vector === '-'
  //     || !flawRhCvss.value?.vector) {
  //     return [[{ char: '-', isHighlighted: false }]];
  //   }

  //   const result = [];
  //   const nvdCvssValue = flawNvdCvss.value?.vector || '-';
  //   const cvssValue = flawRhCvss.value?.vector || '-';
  //   const maxLength = Math.max(nvdCvssValue.length, cvssValue.length);

  //   if (formatScore(flawNvdCvss.value?.score) !== formatScore(flawRhCvss.value?.score)) {
  //     result.push(
  //       { char: formatScore(flawNvdCvss.value?.score), isHighlighted: true },
  //       { char: ' ', isHighlighted: false },
  //     );
  //   }

  //   for (let i = 0; i < maxLength; i++) {
  //     const charFromFlaw = i < nvdCvssValue.length ? nvdCvssValue[i] : '';
  //     const charFromCvss = i < cvssValue.length ? cvssValue[i] : '';
  //     result.push({
  //       char: charFromFlaw,
  //       isHighlighted: shouldDisplayEmailNistForm.value && charFromFlaw !== charFromCvss,
  //     });
  //   }

  //   return groupWith((a, b) => a.isHighlighted === b.isHighlighted, result);
  // });

  async function saveCvssScores() {
    const queue = [];
    for (const cvssData of Object.values(rhFlawCvssScores.value)) {
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

  function updateScore(score: null | number) {
    rhCvss.value.score = score;
  }
  function updateVector(vector: null | string) {
    rhCvss.value.vector = vector;
  }

  const cvssVector = computed(() => rhCvss.value.vector);
  const cvssScore = computed(() => rhCvss.value.score);

  return {
    updateVector,
    updateScore,
    cvssVersion,
    cvssVector,
    cvssScore,
    wasCvssModified,
    flawRhCvss,
    rhCvss,
    saveCvssScores,
    ...useFlawCvssStrings(flawRhCvss),
  };
}

function useFlawCvssStrings(flawRhCvss: ComputedRef<ZodFlawCVSSType>) {
  const { cvss4Score, cvss4Vector } = useCvss4Calculator();

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

  return {
    rhCvssString,
    nvdCvssString,
    highlightedNvdCvssString,
    shouldDisplayEmailNistForm,
  };
}
