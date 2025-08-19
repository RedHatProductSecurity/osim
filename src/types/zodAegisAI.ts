import { z } from 'zod';

// Type definitions for AEGIS-AI API
// Based on the OpenAPI schema from AEGIS-AI

// Component Feature Names for CVE Analysis
export const ZodAegisAIComponentFeatureName = z.enum([
  'suggest-impact',
  'suggest-cwe',
  'rewrite-description',
  'rewrite-statement',
  'identify-pii',
  'cvss-diff-explainer',
]);

export const ZodAegisAIComponentFeatureNameV2 = z.enum([
  'component-intelligence',
]);

export type ZodAegisAIComponentFeatureNameType = z.infer<typeof ZodAegisAIComponentFeatureName>;
export type ZodAegisAIComponentFeatureNameV2Type = z.infer<typeof ZodAegisAIComponentFeatureNameV2>;

// CVE Analysis Request Parameters
export const ZodAegisAICVEAnalysisParams = z.object({
  feature: ZodAegisAIComponentFeatureName,
  cve_id: z.string().regex(/^CVE-\d{4}-\d{4,7}$/, 'Invalid CVE ID format'),
  detail: z.boolean().optional(),
});

export type ZodAegisAICVEAnalysisParamsType = z.infer<typeof ZodAegisAICVEAnalysisParams>;

// Component Analysis Request Parameters
export const ZodAegisAIComponentAnalysisParams = z.object({
  feature: ZodAegisAIComponentFeatureNameV2,
  component: z.string(),
  detail: z.boolean().optional(),
});

export type ZodAegisAIComponentAnalysisParamsType = z.infer<typeof ZodAegisAIComponentAnalysisParams>;

export const ZodAegisAICVEAnalysisWithContextParams = z.object({
  feature: ZodAegisAIComponentFeatureName,
  detail: z.boolean().optional(),
  // Request body data
  cve_id: z.string().regex(/^CVE-\d{4}-\d{4,7}$/, 'Invalid CVE ID format'),
  components: z.array(z.string()).optional(),
  title: z.string().optional(),
  trackers: z.array(z.any()).optional(),
  comment_zero: z.string().optional(),
  cve_description: z.string().optional(),
  requires_cve_description: z.string().optional(),
  statement: z.string().optional(),
});

export type ZodAegisAICVEAnalysisWithContextParamsType = z.infer<typeof ZodAegisAICVEAnalysisWithContextParams>;

// Validation Error (from OpenAPI schema)
export const ZodAegisAIValidationError = z.object({
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
  type: z.string(),
});

export type ZodAegisAIValidationErrorType = z.infer<typeof ZodAegisAIValidationError>;

// HTTP Validation Error
export const ZodAegisAIHTTPValidationError = z.object({
  detail: z.array(ZodAegisAIValidationError).optional(),
});

export type ZodAegisAIHTTPValidationErrorType = z.infer<typeof ZodAegisAIHTTPValidationError>;

// Suggestion context values used to enrich AEGIS-AI requests
export const ZodAegisSuggestionContext = z.object({
  cveId: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  commentZero: z.string().nullable().optional(),
  cveDescription: z.string().nullable().optional(),
  requiresCveDescription: z.string().nullable().optional(),
  statement: z.string().nullable().optional(),
  components: z.array(z.string()).nullable().optional(),
});

type _ZodAegisSuggestionContext = z.infer<typeof ZodAegisSuggestionContext>;

export type AegisSuggestionContextRefs = {
  [K in keyof _ZodAegisSuggestionContext]: import('vue').Ref<_ZodAegisSuggestionContext[K]>;
};

export const ZodAegisSuggestCWEResponse = z.object({
  cwe: z.array(z.string()),
  confidence: z.union([z.number(), z.string()]).optional(),
  explanation: z.string().optional(),
});

export type ZodAegisSuggestCWEResponseType = z.infer<typeof ZodAegisSuggestCWEResponse>;
