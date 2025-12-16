import { nativeEnum, z } from 'zod';
import { DateTime } from 'luxon';
import { PackageURL } from 'packageurl-js';

import { cveRegex } from '@/utils/helpers';
import { loadCweData } from '@/services/CweService';
import { CommentType } from '@/constants';
import type { ValueOf } from '@/types';

import {
  NistCvssValidationEnum,
  RequiresCveDescriptionEnum,
  FlawSourceEnum,
  IssuerEnum,
  FlawReferenceType,
  StateEnum,
  MajorIncidentStateEnum,
} from '../generated-client';
import { zodOsimDateTime, ImpactEnumWithBlank, ZodFlawClassification, ZodAlertSchema } from './zodShared';
import { ZodAffectSchema, type ZodAffectType } from './zodAffect';

// Aegis AI Change Types
export const ZodAegisChangeTypeEnum = z.enum(['AI', 'Partial AI']);
export type AegisChangeType = z.infer<typeof ZodAegisChangeTypeEnum>;

export const RequiresDescriptionEnumWithBlank = { '': '', ...RequiresCveDescriptionEnum } as const;
export const FlawSourceEnumWithBlank = { '': '', ...FlawSourceEnum } as const;
export const MajorIncidentStateEnumWithBlank = {
  '': '',
  'Major Incident Requested': MajorIncidentStateEnum.MajorIncidentRequested,
  'Major Incident Approved': MajorIncidentStateEnum.MajorIncidentApproved,
  'Major Incident Rejected': MajorIncidentStateEnum.MajorIncidentRejected,
  'Exploits (KEV) Requested': MajorIncidentStateEnum.ExploitsKevRequested,
  'Exploits (KEV) Approved': MajorIncidentStateEnum.ExploitsKevApproved,
  'Exploits (KEV) Rejected': MajorIncidentStateEnum.ExploitsKevRejected,
  'Minor Incident Requested': MajorIncidentStateEnum.MinorIncidentRequested,
  'Minor Incident Approved': MajorIncidentStateEnum.MinorIncidentApproved,
  'Minor Incident Rejected': MajorIncidentStateEnum.MinorIncidentRejected,
} as const;
export const NistCvssValidationEnumWithBlank = { '': '', ...NistCvssValidationEnum } as const;

export const flawSources = Object.values(FlawSourceEnumWithBlank);

const flawImpactsWeight: Record<ValueOf<typeof ImpactEnumWithBlank>, number> = {
  '': 0,
  'LOW': 1,
  'MODERATE': 2,
  'IMPORTANT': 3,
  'CRITICAL': 4,
} as const;

export const flawImpacts = Object.values(ImpactEnumWithBlank)
  .sort((a, b) => flawImpactsWeight[b] - flawImpactsWeight[a]);
export const flawImpactEnum = Object.fromEntries(
  Object.entries(ImpactEnumWithBlank).sort(([, a], [, b]) => flawImpactsWeight[b] - flawImpactsWeight[a])
    .map(([k, v]) => [k.toUpperCase(), v]), // TODO: Remove once all enums are capitalized
);

export const flawIncidentStates = Object.values(MajorIncidentStateEnumWithBlank);
export const descriptionRequiredStates = Object.values(RequiresDescriptionEnumWithBlank);

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
  alerts: z.array(ZodAlertSchema).default([]),
});

export type ZodFlawReferenceType = z.infer<typeof FlawReferenceSchema>;
export const FlawReferenceSchema = z.object({
  description: z.string().default(''),
  uuid: z.string().default(''),
  type: z.nativeEnum(FlawReferenceType).default('ARTICLE'),
  url: z.string().default(''),
  embargoed: z.boolean().default(false),
  updated_dt: zodOsimDateTime().nullish().default(null),
  alerts: z.array(ZodAlertSchema).default([]),
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
});

export const flawReferenceTypeValues = Object.values(FlawReferenceType);

export type ZodFlawCVSSType = z.infer<typeof FlawCVSSSchema>;
export type FlawCVSSSchemaType = typeof FlawCVSSSchema;
export const FlawCVSSSchema = z.object({
  comment: z.string().nullable(),
  cvss_version: z.string(),
  flaw: z.string().uuid().nullish(),
  issuer: z.nativeEnum(IssuerEnum),
  score: z.number().nullable(), // $float
  uuid: z.string().uuid().nullable(), // read-only
  vector: z.string().nullable(),
  embargoed: z.boolean().nullable(),
  created_dt: zodOsimDateTime().nullish(), // $date-time, // read-only
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
  alerts: z.array(ZodAlertSchema).default([]),
});

export type ZodFlawCommentType = z.infer<typeof ZodFlawCommentSchema>;
export const ZodFlawCommentSchema = z.object({
  uuid: z.string(),
  external_system_id: z.string(),
  text: z.string().nullish(),
  creator: z.string().nullish(),
  is_private: z
    .string()
    .transform(booleanString => booleanString === 'True')
    .or(z.boolean())
    .nullish(),
  created_dt: zodOsimDateTime().nullish(),
  updated_dt: zodOsimDateTime().nullish(),
  alerts: z.array(ZodAlertSchema).default([]),
  type: nativeEnum(CommentType).optional(),
});

export type ZodFlawHistoryItemType = z.infer<typeof ZodHistoryItemSchema>;
export const ZodHistoryItemSchema = z.object({
  pgh_created_at: zodOsimDateTime().nullish(),
  pgh_slug: z.string().nullish(),
  pgh_label: z.string(),
  pgh_context: z.object({ url: z.string(), user: z.number() }).nullable(),
  pgh_diff: z.record(z.array(z.any())).nullable(),
});

export enum FlawLabelTypeEnum {
  CONTEXT_BASED = 'context_based',
  PRODUCT_FAMILY = 'product_family',
}
export type ZodFlawLabelType = NonNullable<ZodFlawType['labels']>[number];
export type ZodFlawType = z.infer<typeof ZodFlawSchema>;
export type FlawSchemaType = typeof ZodFlawSchema;

export const ZodFlawSchema = z.object({
  uuid: z.string().default(''),
  cve_id: z.string().nullable().refine(
    cve => !cve || cveRegex.test(cve),
    {
      message: 'The CVE ID is invalid: It must begin with "CVE-", ' +
      'have a year between 1999-2999, and have an identifier at least ' +
      '4 digits long (e.g. use 0001 for 1). Please also check for ' +
      'unexpected characters like spaces.',
    },
  ),
  impact: z.nativeEnum(ImpactEnumWithBlank).nullable(),
  components: z.array(z.string().min(1).max(100)),
  title: z.string().min(4),
  owner: z.string().nullish(),
  history: z.array(z.any()).nullish(),
  team_id: z.string().nullish(),
  trackers: z.array(z.string()).nullish(), // read-only
  classification: ZodFlawClassification.nullish(),
  comment_zero: z.string().refine(
    comment_zero => comment_zero.trim().length > 0,
    { message: 'Comment#0 cannot be empty.' },
  ),
  cve_description: z.string().nullish(),
  requires_cve_description: z.nativeEnum(RequiresDescriptionEnumWithBlank).nullish(),
  statement: z.string().nullish(),
  cwe_id: z.string().max(255).nullish(),
  unembargo_dt: zodOsimDateTime().nullish(), // $date-time,
  reported_dt: zodOsimDateTime().nullish(), // $date-time,
  source: z.nativeEnum(FlawSourceEnumWithBlank).refine(
    Boolean,
    { message: 'You must specify a source for this Flaw before saving.' },
  ),
  meta_attr: z.record(z.string(), z.string().nullish()).nullish(),
  aegis_meta: z.record(z.string(), z.array(z.object({
    type: ZodAegisChangeTypeEnum,
    timestamp: z.string(),
    value: z.string().optional(),
  }))).nullish(),
  mitigation: z.string().nullish(),
  major_incident_state: z.nativeEnum(MajorIncidentStateEnumWithBlank).nullable(),
  nist_cvss_validation: z.nativeEnum(NistCvssValidationEnumWithBlank).nullish(),
  affects: z.array(ZodAffectSchema), // read-only
  comments: z.array(ZodFlawCommentSchema),
  cvss_scores: z.array(FlawCVSSSchema),
  labels: z.array(z.object({
    uuid: z.string().optional(),
    label: z.string(),
    state: z.nativeEnum(StateEnum),
    contributor: z.string().optional(),
    relevant: z.boolean(),
    type: z.nativeEnum(FlawLabelTypeEnum),
  })).nullish(),
  references: z.array(FlawReferenceSchema),
  acknowledgments: z.array(FlawAcknowledgmentSchema),
  embargoed: z.boolean(),
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
  alerts: z.array(ZodAlertSchema).default([]),
  task_key: z.string().max(60).nullish(),
  created_dt: zodOsimDateTime().nullish(),
}).superRefine((zodFlaw, zodContext) => {
  const raiseIssue = (message: string, path: string[]) => {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  };

  if (
    zodFlaw.requires_cve_description
    && ['APPROVED', 'REQUESTED'].includes(zodFlaw.requires_cve_description)
    && zodFlaw.cve_description === ''
  ) {
    raiseIssue('Description cannot be blank if requested or approved.', ['cve_description']);
  }

  if (zodFlaw.classification?.state !== 'REJECTED') {
    if (zodFlaw.impact === null || typeof zodFlaw.impact === 'undefined') {
      raiseIssue('You must select an impact before saving the Flaw.', ['impact']);
    }

    if (zodFlaw.components.length === 0) {
      raiseIssue('Components cannot be empty.', ['components']);
    }
  }

  const unembargo_dt = DateTime.fromISO(`${zodFlaw.unembargo_dt}`).toISODate();
  const reported_dt = DateTime.fromISO(`${zodFlaw.reported_dt}`).toISODate();

  if (zodFlaw.embargoed && unembargo_dt && unembargo_dt < DateTime.now().toISODate()) {
    raiseIssue('An embargoed flaw must have a public date in the future.', ['unembargo_dt']);
  }

  if (!zodFlaw.embargoed && !unembargo_dt && zodFlaw.classification?.state !== 'REJECTED') {
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
      'Affected component cannot be registered on the affected component/PURL twice',
      ['affects', `${affect.index}`, 'ps_component'],
    );
  }

  if (zodFlaw.cwe_id) {
    const cweData = loadCweData();
    zodFlaw.cwe_id?.match(/CWE-\d+/gi)?.forEach((flawCWE) => {
      cweData
        .filter(member => `CWE-${member.id}` === flawCWE && (member.isProhibited || member.isDiscouraged))
        .forEach((member) => {
          let msg = `CWE-${member.id} is ${member.usage.toLowerCase()}`;

          if (member.usage.toLowerCase() === 'discouraged') {
            msg += `, use another under the same CWE class (${member.category})`;
          }

          raiseIssue(msg, ['cwe_id']);
        });
    });
  }
});

const duplicatedAffects = (affects: ZodAffectType[]) => {
  const map: Record<string, boolean> = {};
  for (let i = 0; i < affects.length; i++) {
    let key: string;
    const affect = affects[i];
    if (affect.purl) {
      // If purl is present: unique on (ps_update_stream, purl_normalized)
      // purl_normalized is the purl without qualifiers (matching OSIDB behavior)
      const parsedPurl = PackageURL.fromString(affect.purl);
      const normalizedPurl = new PackageURL(
        parsedPurl.type,
        parsedPurl.namespace,
        parsedPurl.name,
        parsedPurl.version,
        null, // Remove qualifiers
        parsedPurl.subpath,
      ).toString();
      key = `${affect.ps_update_stream}-${normalizedPurl}`;
    } else {
      // If no purl: unique on (ps_update_stream, ps_component)
      key = `${affect.ps_update_stream}-${affect.ps_component}`;
    }

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
