import { z } from 'zod';
import {
  FlawType,
  ImpactEnum,
  MajorIncidentStateEnum,
  NistCvssValidationEnum,
  RequiresSummaryEnum,
  Source8d8Enum,
  AffectType,
  AffectednessEnum,
  ResolutionEnum,
  IssuerEnum,
  FlawMetaType,
  FlawClassificationStateEnum,
  FlawReferenceType,
} from '../generated-client';
import { DateTime } from 'luxon';
import { cveRegex } from '@/utils/helpers';

const FlawTypeWithBlank = { '': '', ...FlawType } as const;
const ImpactEnumWithBlank = { '': '', ...ImpactEnum } as const;
const RequiresSummaryEnumWithBlank = { '': '', ...RequiresSummaryEnum } as const;
const Source8d8EnumWithBlank = { '': '', ...Source8d8Enum } as const;
const MajorIncidentStateEnumWithBlank = { '': '', ...MajorIncidentStateEnum } as const;
const NistCvssValidationEnumWithBlank = { '': '', ...NistCvssValidationEnum } as const;
const AffectednessEnumWithBlank = { '': '', ...AffectednessEnum } as const;
const ResolutionEnumWithBlank = { '': '', ...ResolutionEnum } as const;

const zodOsimDateTime = () =>
  z
    .date()
    .transform((val) => DateTime.fromJSDate(val).toUTC().toISO())
    .or(z.string().superRefine((dateString, zodContext) => {
      if (!z.string().datetime().safeParse(dateString).success) {
        zodContext.addIssue({
          message: `Invalid date format for ${dateString}`,
          code: z.ZodIssueCode.custom,
          path: zodContext.path,
        });
      }
    }));
    
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
}).superRefine((reference, zodContext)=>{
  if (reference.type === 'ARTICLE' && !reference.url.match(/^https:\/\/access\.redhat\.com\//) ) {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Red Hat Security Bulletin URLs must be from https://access.redhat.com/',
      path: ['url'],
    });
  }

  if (!reference.url.match(/^https:\/\//) ) {
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reference URL must begin with https://',
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

export const AffectCVSSSchema = z.object({
  affect: z.string().uuid(),
  comment: z.string().nullable(),
  cvss_version: z.string(),
  issuer: z.nativeEnum(IssuerEnum),
  score: z.number(), // $float
  uuid: z.string().uuid().nullable(), // read-only
  vector: z.string().nullable(),
  embargoed: z.boolean().nullable(),
  created_dt: zodOsimDateTime().nullish(), // $date-time, // read-only
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

export const ErratumSchema = z.object({
  et_id: z.number(),
  advisory_name: z.string(),
  shipped_dt: z.string().nullable(),
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

export const TrackerSchema = z.object({
  affects: z.array(z.string().uuid()),
  errata: z.array(ErratumSchema),
  external_system_id: z.string(),
  meta_attr: z
    .object({
      bz_id: z.string(),
      owner: z.string(),
      qe_owner: z.string(),
      ps_component: z.string(),
      ps_module: z.string(),
      ps_update_stream: z.string(),
      resolution: z.string(),
      status: z.string(),
    })
    .nullish(),
  ps_update_stream: z.string().max(100).nullish(),
  status: z.string().max(100).nullish(),
  resolution: z.string().max(100).nullish(),
  type: z.enum(['JIRA', 'BUGZILLA']),
  uuid: z.string().uuid().nullable(),
  embargoed: z.boolean().readonly(),
  impact: z.nativeEnum(ImpactEnumWithBlank).nullish(),
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

export const ZodFlawClassification = z.object({
  workflow: z.string(),
  state: z.nativeEnum(FlawClassificationStateEnum),
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

export type ZodAffectType = z.infer<typeof ZodAffectSchema>;
export const ZodAffectSchema = z.object({
  uuid: z.string().uuid(),
  flaw: z.string().nullish(),
  type: z.nativeEnum(AffectType).nullish(),
  affectedness: z.nativeEnum(AffectednessEnumWithBlank).nullish(),
  resolution: z.nativeEnum(ResolutionEnumWithBlank).nullish(),
  ps_module: z.string().max(100),
  ps_component: z.string().max(255),
  impact: z.nativeEnum(ImpactEnumWithBlank).nullish(),
  trackers: z.array(TrackerSchema),
  meta_attr: z
    .object({
      affectedness: z.string(),
      component: z.string(),
      cvss2: z.string(),
      cvss3: z.string(),
      impact: z.string(),
      module_name: z.string(),
      module_stream: z.string(),
      ps_component: z.string(),
      ps_module: z.string(),
      resolution: z.string(),
    })
    .nullish(),
  delegated_resolution: z.string().nullable(),
  cvss_scores: z.array(AffectCVSSSchema),
  classification: ZodFlawClassification.nullish(),
  embargoed: z.boolean(), // read-only
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

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

export const ZodFlawSchema = z.object({
  // type: z.nativeEnum(FlawType).optional(),
  type: z.nativeEnum(FlawTypeWithBlank).nullish(),
  uuid: z.string().default(''),
  cve_id: z.string().refine(
    (cve) => cveRegex.test(cve),
    { message: 'You must enter a valid CVE ID before saving the Flaw.' }
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
  description: z.string().min(10),
  summary: z.string().nullish(),
  requires_summary: z.nativeEnum(RequiresSummaryEnumWithBlank).nullish(),
  statement: z.string().nullish(),
  cwe_id: z.string().max(255).nullish(),
  unembargo_dt: zodOsimDateTime().nullish(), // $date-time,
  unembargo_at_dt: zodOsimDateTime().nullish(), // $date-time,
  reported_dt: zodOsimDateTime().nullish(), // $date-time,
  source: z.nativeEnum(Source8d8EnumWithBlank).refine(
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
}).superRefine((zodFlaw, zodContext)=>{

  const raiseDateIssue = (message: string) =>{
    zodContext.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ['unembargo_dt'],
    });
  };
  const unembargo_dt = DateTime.fromISO(`${zodFlaw.unembargo_dt}`).toISODate();

  if (zodFlaw.embargoed && unembargo_dt && unembargo_dt < DateTime.now().toISODate()) {
    raiseDateIssue('An embargoed flaw must have a public date in the future.');
  }

  if (!zodFlaw.embargoed && !unembargo_dt) {
    // if embargoed and dt is not set, shows up the error
    // This behaviour is not acceptable because if a flaw is unembargoed,
    // it means the flaw is public already which requires the date when this was made public.
    raiseDateIssue('A public flaw must have a public date set.');
  }

  if (!zodFlaw.embargoed && unembargo_dt && unembargo_dt > DateTime.now().toISODate()) {
    // if NOT embargoed and updated date is in the future,
    // it shows an error, to set the current date or an older date instead
    raiseDateIssue('A public flaw cannot have a public date in the future.');
  }
});

// const ZodFlawSchemaPartial = ZodFlawSchema.partial();

type SchemaType =
  | typeof FlawCVSSSchema
  | typeof AffectCVSSSchema
  | typeof ErratumSchema
  | typeof TrackerSchema
  | typeof ZodAffectSchema
  | typeof ZodFlawMetaSchema
  | typeof ZodFlawClassification;

type SchemaTypeWithEffect = SchemaType | typeof ZodFlawSchema;

export const fieldsFor = (schema: SchemaTypeWithEffect) => schema._def.typeName === 'ZodEffects' 
  ? Object.keys(schema._def.schema.shape)
  : Object.keys((schema as SchemaType).shape);


const extractEnum = (zodEnum: any): string[] => Object.values(zodEnum.unwrap().unwrap().enum);

export const flawTypes = Object.values(FlawTypeWithBlank);
export const flawSources = Object.values(Source8d8EnumWithBlank); // TODO: handle blank in the component
export const flawImpacts = Object.values(ImpactEnumWithBlank); // TODO: handle blank in the component
export const flawIncidentStates = Object.values(MajorIncidentStateEnumWithBlank);

const {
  impact: zodAffectImpact,
  resolution: zodAffectResolution,
  affectedness: zodAffectAffectedness,
  type: zodAffectType,
} = ZodAffectSchema.shape;

export const affectImpacts = extractEnum(zodAffectImpact);
export const affectResolutions = extractEnum(zodAffectResolution);
export const affectAffectedness = extractEnum(zodAffectAffectedness);
export const affectTypes = extractEnum(zodAffectType);
