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
  ZodAlertType,
} from '@/types/zodShared';

export type ValueOf<T> = T[keyof T];

export type Nullable<T> = null | T | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type DictKey = number | string | symbol;

export type Dict<K extends DictKey = string, T = any> = Record<K, T>;
