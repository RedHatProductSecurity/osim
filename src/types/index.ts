import type { Ref } from 'vue';

import type { ZodFlawCVSSType } from '@/types/zodFlaw';
import type { ZodAffectCVSSType } from '@/types/zodAffect';

export type Cvss = ZodAffectCVSSType | ZodFlawCVSSType;
export type CvssEntity = {
  [key: string]: unknown;
  cvss_scores: ZodAffectCVSSType[];
};

export type {
  AegisAIComponentAnalysisParamsType,
  AegisAIComponentFeatureNameType,
  AegisAIComponentFeatureNameV2Type,
  AegisAICVEAnalysisParamsType,
  AegisAIHTTPValidationErrorType,
  AegisAIValidationErrorType,
} from '@/types/aegisAI';

export type {
  AffectCVSSSchemaType,
  AffectSchemaType,
  ErratumSchemaType,
  TrackerSchemaType,
  ZodAffectCVSSType,
  ZodAffectType,
  ZodTrackerType,
} from '@/types/zodAffect';

export type {
  FlawCVSSSchemaType,
  FlawSchemaType,
  ZodFlawAcknowledgmentType,
  ZodFlawCommentType,
  ZodFlawCVSSType,
  ZodFlawLabelType,
  ZodFlawReferenceType,
  ZodFlawType,
} from '@/types/zodFlaw';

export {
  flawImpacts,
  flawIncidentStates,
  flawSources,
  ZodFlawSchema,
} from '@/types/zodFlaw';

export type {
  ZodJiraContributorType,
  ZodJiraIssueType,
  ZodJiraUserAssignableType,
} from '@/types/zodJira';

export type {
  ImpactEnumWithBlankType,
  ZodAlertType,
} from '@/types/zodShared';

export type ValueOf<T> = T[keyof T];

export type Nullable<T> = null | T | undefined;

export type HardNullable<T> = null | T;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type NullableRef<T> = null | Ref<T>;

export type RefNullable<T> = Ref<HardNullable<T>>;

export type DeepNullableRef<T> = HardNullable<RefNullable<T>>;

export type DictKey = number | string | symbol;

export type Dict<K extends DictKey = string, T = any> = Record<K, T>;

export type DeepMapValues<T, V> = T extends Array<infer U>
  ? DeepMapValues<U, V>[]
  : T extends object
    ? { [K in keyof T]: DeepMapValues<T[K], V> }
    : V;

export type DeepNullable<T> = T extends Array<infer U>
  ? DeepNullable<U>[] | null
  : T extends object
    ? { [K in keyof T]: DeepNullable<T[K]> }
    : null | T;
