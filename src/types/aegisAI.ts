// AI Change Tracking Types
import type { Feedback } from '@/generated-client/aegis-ai/models';

import type { Nullable } from '.';
import type { AegisChangeType } from './zodFlaw';
import type { ImpactEnumWithBlankType } from './zodShared';

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
export type SuggestableFlawFields = '_cvss3_vector' | 'cwe_id' | 'impact' | 'mitigation' | 'statement';

export type SuggestionDetails = CvssSuggestionDetails
  & CweSuggestionDetails
  & ImpactSuggestionDetails
  & MitigationSuggestionDetails
  & StatementSuggestionDetails;

export type CvssSuggestionDetails = {
  cvss3_vector: Nullable<string>;
} & SuggestionDetailOptionals;

export type CweSuggestionDetails = {
  cwe: Nullable<string[]>;
} & SuggestionDetailOptionals;

export type ImpactSuggestionDetails = {
  impact: Nullable<ImpactEnumWithBlankType>;
} & SuggestionDetailOptionals;

export type MitigationSuggestionDetails = {
  suggested_mitigation: Nullable<string>;
} & SuggestionDetailOptionals;

export type SuggestionDetailOptionals = {
  confidence?: number | string;
  explanation?: string;
  tools_used?: string[];
};

export type DescriptionSuggestionDetails = {
  suggested_description?: string;
  suggested_title?: string;
} & SuggestionDetailOptionals;

export type StatementSuggestionDetails = {
  suggested_statement: Nullable<string>;
} & SuggestionDetailOptionals;

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
  'suggest-cvss': CvssSuggestionDetails;
  'suggest-cwe': CweSuggestionDetails;
  'suggest-description': DescriptionSuggestionDetails;
  'suggest-impact': ImpactSuggestionDetails;
  'suggest-statement': MitigationSuggestionDetails | StatementSuggestionDetails;
};

export type AegisFeature = keyof AegisFeatureResponseMap;

export type { Feedback as AegisFeedbackPayload } from '@/generated-client/aegis-ai/models';

export type AegisKpiMetricsFeature = {
  acceptance_percentage: number;
  entries: {
    accepted: boolean;
    aegis_version: string;
    datetime: string;
  }[];
};

export type AegisKpiMetrics = Record<AegisKpiFeatureParamType, AegisKpiMetricsFeature>;

export type AegisKpiFeatureParamType =
  'all'
  | 'suggest-cvss'
  | 'suggest-cwe'
  | 'suggest-description'
  | 'suggest-impact'
  | 'suggest-statement'
  | 'suggest-title';
// Extend generated Feedback type with optional comment field (for negative feedback)
export type AegisFeedbackPayload = { comment?: string } & Feedback;
