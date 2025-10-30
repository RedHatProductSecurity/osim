// AI Change Tracking Types
import type { AegisChangeType } from './zodFlaw';

// Component Feature Names for CVE Analysis
export type AegisAIComponentFeatureNameType =
  | 'cvss-diff-explainer'
  | 'identify-pii'
  | 'suggest-cwe'
  | 'suggest-description'
  | 'suggest-impact'
  | 'suggest-statement';

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
export type CweSuggestionDetails = {
  confidence?: number;
  cwe: string[];
  explanation?: string;
  tools_used?: string[];
};

export type DescriptionSuggestionDetails = {
  confidence?: number | string;
  description?: string;
  explanation?: string;
  suggested_description?: string;
  suggested_title?: string;
  title?: string;
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

export type AegisFeatureResponseMap = {
  'suggest-cwe': CweSuggestionDetails;
  'suggest-description': DescriptionSuggestionDetails;
};

export type AegisFeature = keyof AegisFeatureResponseMap;
