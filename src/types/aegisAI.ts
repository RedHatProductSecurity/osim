// AI Change Tracking Types
import type { Nullable } from '.';
import type { AegisChangeType } from './zodFlaw';
import type { ImpactEnumWithBlankType } from './zodShared';

// Component Feature Names for CVE Analysis
export type AegisAIComponentFeatureNameType =
  | 'cvss-diff-explainer'
  | 'identify-pii'
  | 'rewrite-description'
  | 'rewrite-statement'
  | 'suggest-cwe'
  | 'suggest-impact';

export type AegisAIComponentFeatureNameV2Type = 'component-intelligence';

// CVE Analysis Request Parameters
export type AegisAICVEAnalysisParamsType = {
  cve_id: string;
  detail?: boolean;
  feature: AegisAIComponentFeatureNameType;
};

// Component Analysis Request Parameters
export type AegisAIComponentAnalysisParamsType = {
  component: string;
  detail?: boolean;
  feature: AegisAIComponentFeatureNameV2Type;
};

export type AegisAICVEAnalysisWithContextParamsType = {
  comment_zero?: string;
  components?: string[];
  cve_description?: string;
  cve_id: string;
  detail?: boolean;
  feature: AegisAIComponentFeatureNameType;
  requires_cve_description?: string;
  statement?: string;
  title?: string;
  trackers?: any[];
};

// Validation Error (from OpenAPI schema)
export type AegisAIValidationErrorType = {
  loc: Array<number | string>;
  msg: string;
  type: string;
};

// AEGIS AI Fields Types
export type SuggestableFlawFields = '_cvss3_vector' | 'cwe_id' | 'impact';

export type SuggestionDetails = CvssSuggestionDetails & CweSuggestionDetails & ImpactSuggestionDetails;

export type CvssSuggestionDetails = {
  cvss3_vector: Nullable<string>;
} & SuggestionDetailOptionals;

export type CweSuggestionDetails = {
  cwe: Nullable<string[]>;
} & SuggestionDetailOptionals;

export type ImpactSuggestionDetails = {
  impact: Nullable<ImpactEnumWithBlankType>;
} & SuggestionDetailOptionals;

export type SuggestionDetailOptionals = {
  confidence?: number | string;
  explanation?: string;
  tools_used?: string[];
};
// HTTP Validation Error
export type AegisAIHTTPValidationErrorType = {
  detail?: AegisAIValidationErrorType[];
};

// AI Change Tracking Types
export type AegisChangeEntry = {
  timestamp: string;
  type: AegisChangeType;
  value?: string;
};

export type AegisMetadata = {
  [fieldName: string]: AegisChangeEntry[];
};
