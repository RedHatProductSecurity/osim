import { z } from 'zod';
import {
  FlawType,
  MajorIncidentStateEnum,
  NistCvssValidationEnum,
  RequiresSummaryEnum,
  Source642Enum,
  IssuerEnum,
  FlawMetaType,
  FlawReferenceType,
} from '../generated-client';
import { DateTime } from 'luxon';
import { cveRegex } from '@/utils/helpers';
import { zodOsimDateTime, ImpactEnumWithBlank, ZodFlawClassification } from './zodShared';
import { ZodAffectSchema, type ZodAffectType } from './zodAffect';

export const FlawTypeWithBlank = { '': '', ...FlawType } as const;
export const RequiresSummaryEnumWithBlank = { '': '', ...RequiresSummaryEnum } as const;
export const Source642EnumWithBlank = { '': '', ...Source642Enum } as const;
export const MajorIncidentStateEnumWithBlank = { '': '', ...MajorIncidentStateEnum } as const;
export const NistCvssValidationEnumWithBlank = { '': '', ...NistCvssValidationEnum } as const;

export const flawTypes = Object.values(FlawTypeWithBlank);
export const flawSources = Object.values(Source642EnumWithBlank);

const flawImpactsWeight = {
  '': 0,
  'LOW': 1,
  'MODERATE': 2,
  'IMPORTANT': 3,
  'CRITICAL': 4,
};

export const flawImpacts = Object.values(ImpactEnumWithBlank)
  .sort((a, b) => flawImpactsWeight[b] - flawImpactsWeight[a]);
export const flawIncidentStates = Object.values(MajorIncidentStateEnumWithBlank);
export const summaryRequiredStates = Object.values(RequiresSummaryEnumWithBlank);

export type ZodFlawAcknowledgmentType = z.infer<typeof FlawAcknowledgmentSchema>;
export const FlawAcknowledgmentSchema = z.object({
  name: z.string().default(''),
  affiliation: z.string().default(''),
  from_upstream: z.boolean().default(false),
  flaw: z.string().default(''),
  uuid: z.string().default(''),
  embargoed: z.boolean().default(false),
  created_dt: zodOsimDateTime().nullish(),
  updated_dt: zodOsimDateTime().nullish(),
});

export type ZodFlawReferenceType = z.infer<typeof FlawReferenceSchema>;
export const FlawReferenceSchema = z.object({
  description: z.string().default(''),
  uuid: z.string().default(''),
  type: z.nativeEnum(FlawReferenceType).default('ARTICLE'),
  url: z.string().default(''),
  embargoed: z.boolean().default(false),
  updated_dt: zodOsimDateTime().nullish().default(null),
}).superRefine((reference, zodContext) => {
  if (reference.type === 'ARTICLE' && !reference.url.match(/^https:\/\/access\.redhat\.com\//)) {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Red Hat Security Bulletin URLs must be from https://access.redhat.com/',
      path: ['url'],
    });
  }

  if (!reference.url.match(/^(?:https?:\/\/)/)) {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reference URL must begin with either https:// or http://',
      path: ['url'],
    });
  }

  if (!reference.url) {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reference URL cannot be empty',
      path: ['url'],
    });
  }

  if (!reference.description) {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reference description cannot be empty',
      path: ['description'],
    });
  }
});

export const flawReferenceTypeValues = Object.values(FlawReferenceType);

export type ZodFlawCVSSType = z.infer<typeof FlawCVSSSchema>;
export type FlawCVSSSchemaType = typeof FlawCVSSSchema;
export const FlawCVSSSchema = z.object({
  comment: z.string().nullable(),
  cvss_version: z.string(),
  flaw: z.string().uuid(),
  issuer: z.nativeEnum(IssuerEnum),
  score: z.number(), // $float
  uuid: z.string().uuid().nullable(), // read-only
  vector: z.string().nullable(),
  embargoed: z.boolean().nullable(),
  created_dt: zodOsimDateTime().nullish(), // $date-time, // read-only
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});


export const ZodFlawCommentSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  external_system_id: z.string(),
  order: z.number(),
  // meta_attr: z.record(z.string(), z.string().nullish()).nullish(),
  meta_attr: z.object({
    id: z.string().nullish(),
    tags: z.string().nullish(),
    text: z.string().nullish(),
    time: z.string().nullish(),
    count: z.string().nullish(),
    bug_id: z.string().nullish(),
    creator: z.string().nullish(),
    creator_id: z.string().nullish(),
    is_private: z
      .string()
      .transform((booleanString) => booleanString === 'True')
      .or(z.boolean())
      .nullish(),
    attachment_id: z.string().nullish(),
    creation_time: z.string().nullish(),
    private_groups: z
      .string()
      // .transform((jsonString: string) => JSON.parse(jsonString.replace(/'/g, '"')))
      .or(z.array(z.string()))
      .nullish(),
  }).nullish(),
  created_dt: zodOsimDateTime().nullish(),
  updated_dt: zodOsimDateTime().nullish(),
});

export type FlawMetaSchemaType = typeof ZodFlawMetaSchema;
export const ZodFlawMetaSchema = z.object({
  uuid: z.string().uuid(),
  type: z.nativeEnum(FlawMetaType).nullish(),
  meta_attr: z.record(z.string(), z.string().nullish()).nullish(),
  embargoed: z.boolean(), // read-only
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

// const flawTypes: string[] = Object.values(FlawType);
export type ZodFlawType = z.infer<typeof ZodFlawSchema>;
export type FlawSchemaType = typeof ZodFlawSchema;

export const ZodFlawSchema = z.object({
  // type: z.nativeEnum(FlawType).optional(),
  type: z.nativeEnum(FlawTypeWithBlank).nullish(),
  uuid: z.string().default(''),
  cve_id: z.string().nullable().refine(
    (cve) => !cve || cveRegex.test(cve),
    {
      message: 'The CVE ID is invalid: It must begin with "CVE-", ' +
        'have a year between 1999-2999, and have an identifier at least ' +
        '4 digits long (e.g. use 0001 for 1). Please also check for ' +
        'unexpected characters like spaces.'
    }
  ),
  impact: z.nativeEnum(ImpactEnumWithBlank)
    .refine(
      Boolean,
      { message: 'You must select an impact before saving the Flaw.' }
    ),
  component: z.string().max(100).min(1),
  title: z.string().min(4),
  owner: z.string().nullish(),
  team_id: z.string().nullish(),
  trackers: z.array(z.string()).nullish(), // read-only
  classification: ZodFlawClassification.nullish(),
  description: z.string().refine(
    description => description.trim().length > 0,
    { message: 'Comment#0 cannot be empty.' }
  ),
  summary: z.string().nullish(),
  requires_summary: z.nativeEnum(RequiresSummaryEnumWithBlank).nullish(),
  statement: z.string().nullish(),
  cwe_id: z.string().max(255).nullish(),
  unembargo_dt: zodOsimDateTime().nullish(), // $date-time,
  reported_dt: zodOsimDateTime().nullish(), // $date-time,
  source: z.nativeEnum(Source642EnumWithBlank).refine(
    Boolean,
    { message: 'You must specify a source for this Flaw before saving.' }
  ),
  meta_attr: z.record(z.string(), z.string().nullish()).nullish(),
  mitigation: z.string().nullish(),
  cvss2: z.string().max(100).nullish(), // XXX deprecated
  cvss2_score: z.number().nullish(), // $float // XXX deprecated
  nvd_cvss2: z.string().max(100).nullish(), // XXX deprecated
  cvss3: z.string().max(100).nullish(), // XXX deprecated
  cvss3_score: z.number().nullish(), // $float // XXX deprecated
  nvd_cvss3: z.string().max(100).nullish(), // XXX deprecated
  major_incident_state: z.nativeEnum(MajorIncidentStateEnumWithBlank).nullish(),
  nist_cvss_validation: z.nativeEnum(NistCvssValidationEnumWithBlank).nullish(),
  affects: z.array(ZodAffectSchema), // read-only
  meta: z.array(ZodFlawMetaSchema),
  comments: z.array(ZodFlawCommentSchema),
  cvss_scores: z.array(FlawCVSSSchema),
  references: z.array(FlawReferenceSchema),
  acknowledgments: z.array(FlawAcknowledgmentSchema),
  embargoed: z.boolean(),
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
}).superRefine((zodFlaw, zodContext) => {

  const raiseIssue = (message: string, path: string[]) => {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  };

  const duplicatedAffects = (affects: ZodAffectType[]) => {
    const map: Record<string, boolean> = {};
    for (let i = 0; i < affects.length; i++) {
      const key = `${affects[i].ps_module}-${affects[i].ps_component}`;
      if (map[key]) {
        return {
          index: i,
        };
      } else {
        map[key] = true;
      }
    }
    return null;
  };

  if (
    zodFlaw.requires_summary
    && ['REQUESTED', 'APPROVED'].includes(zodFlaw.requires_summary)
    && zodFlaw.summary === ''
  ) {
    raiseIssue('Description cannot be blank if requested or approved.', ['summary']);
  }

  if (
    zodFlaw.requires_summary !== 'APPROVED'
    && zodFlaw.major_incident_state
    && ['APPROVED', 'CISA_APPROVED'].includes(zodFlaw.major_incident_state)
  ) {
    raiseIssue('Description must be approved for Major Incidents.', ['summary']);
  }

  const unembargo_dt = DateTime.fromISO(`${zodFlaw.unembargo_dt}`).toISODate();
  const reported_dt = DateTime.fromISO(`${zodFlaw.reported_dt}`).toISODate();

  if (zodFlaw.embargoed && unembargo_dt && unembargo_dt < DateTime.now().toISODate()) {
    raiseIssue('An embargoed flaw must have a public date in the future.', ['unembargo_dt']);
  }

  if (!zodFlaw.embargoed && !unembargo_dt) {
    // if embargoed and dt is not set, shows up the error
    // This behaviour is not acceptable because if a flaw is unembargoed,
    // it means the flaw is public already which requires the date when this was made public.
    raiseIssue('A public flaw must have a public date set.', ['unembargo_dt']);
  }

  if (!zodFlaw.embargoed && unembargo_dt && unembargo_dt > DateTime.now().toISODate()) {
    // if NOT embargoed and updated date is in the future,
    // it shows an error, to set the current date or an older date instead
    raiseIssue('A public flaw cannot have a public date in the future.', ['unembargo_dt']);
  }

  if (!zodFlaw.reported_dt) {
    raiseIssue('Reported date is required.', ['reported_dt']);
  }

  if (reported_dt && reported_dt > DateTime.now().toISODate()) {
    raiseIssue('Reported date cannot be in the future.', ['reported_dt']);
  }

  const affect = duplicatedAffects(zodFlaw.affects);
  if (affect) {
    raiseIssue(
      'Affected component cannot be registered on the affected module twice',
      [`Affects/${affect.index}/component`],
    );
  }
});
