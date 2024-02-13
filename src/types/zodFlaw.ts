import {z} from 'zod';
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
    FlawClassificationStateEnum
} from '../generated-client';
import { DateTime } from 'luxon';

const FlawTypeWithBlank = {'': '', ...FlawType,} as const;
const ImpactEnumWithBlank = {'': '',...ImpactEnum} as const;
const RequiresSummaryEnumWithBlank = {'': '',...RequiresSummaryEnum} as const;
const Source8d8EnumWithBlank = {'': '',...Source8d8Enum} as const;
const MajorIncidentStateEnumWithBlank = {'': '',...MajorIncidentStateEnum} as const;
const NistCvssValidationEnumWithBlank = {'': '',...NistCvssValidationEnum} as const;
const AffectednessEnumWithBlank = {'': '',...AffectednessEnum} as const;
const ResolutionEnumWithBlank = {'': '',...ResolutionEnum} as const;

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
    created_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time, // read-only
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
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
    created_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time, // read-only
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
});

export const ErratumSchema = z.object({
    et_id: z.number(),
    advisory_name: z.string(),
    shipped_dt: z.string().nullable(),
    created_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
});

export const TrackerSchema = z.object({
    affects: z.array(z.string().uuid()),
    errata: z.array(ErratumSchema),
    external_system_id: z.string(),
    meta_attr: z.object({
        bz_id: z.string(),
        owner: z.string(),
        qe_owner: z.string(),
        ps_component: z.string(),
        ps_module: z.string(),
        ps_update_stream: z.string(),
        resolution: z.string(),
        status: z.string(),
    }).nullish(),
    ps_update_stream: z.string().max(100).nullish(),
    status: z.string().max(100).nullish(),
    resolution: z.string().max(100).nullish(),
    type: z.enum(['JIRA', 'BUGZILLA']),
    uuid: z.string().uuid().nullable(),
    embargoed: z.boolean().readonly(),
    impact: z.nativeEnum(ImpactEnumWithBlank).nullish(),
    created_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
});

export const ZodFlawClassification = z.object({
    workflow: z.string(),
    state: z.nativeEnum(FlawClassificationStateEnum),
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
    meta_attr: z.object({
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
    }).nullish(),
    delegated_resolution: z.string().nullable(),
    cvss_scores: z.array(AffectCVSSSchema),
    classification: ZodFlawClassification.nullish(),
    embargoed: z.boolean(), // read-only
    created_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
})



export const ZodFlawMetaSchema = z.object({
    uuid: z.string().uuid(),
    type: z.nativeEnum(FlawMetaType).nullish(),
    meta_attr: z.record(z.string(), z.string().nullish()),
    embargoed: z.boolean(), // read-only
    created_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
});

// const flawTypes: string[] = Object.values(FlawType);
export type ZodFlawType = z.infer<typeof ZodFlawSchema>;
export const ZodFlawSchema = z.object({
    // type: z.nativeEnum(FlawType).optional(),
    type: z.nativeEnum(FlawTypeWithBlank).nullish(),
    cve_id: z.string().nullish(),
    impact: z.nativeEnum(ImpactEnumWithBlank).nullish(),
    component: z.string().max(100).nullish(),
    title: z.string().min(1),
    owner: z.string().nullish(),
    team_id: z.string().nullish(),
    trackers: z.array(z.string()).nullish(), // read-only
    classification: ZodFlawClassification.nullish(),
    description: z.string(),
    summary: z.string().nullish(),
    requires_summary: z.nativeEnum(RequiresSummaryEnumWithBlank).nullish(),
    statement: z.string().nullish(),
    cwe_id: z.string().max(255).nullish(),
    unembargo_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    source: z.nativeEnum(Source8d8EnumWithBlank).nullish(),
    reported_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
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
    cvss_scores: z.array(FlawCVSSSchema),
    embargoed: z.boolean(),
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
});

type RegisteredSchemaType = typeof FlawCVSSSchema
    | typeof AffectCVSSSchema
    | typeof ErratumSchema
    | typeof TrackerSchema
    | typeof ZodAffectSchema
    | typeof ZodFlawMetaSchema
    | typeof ZodFlawSchema
    | typeof ZodFlawClassification;

export const fieldsFor = (schema: RegisteredSchemaType) => Object.keys(schema.shape);

const {
  type: zodFlawType,
  source: zodFlawSource,
  impact: zodFlawImpacts,
  major_incident_state: zodFlawMajorIncidentState,
} = ZodFlawSchema.shape;

const extractEnum = (zodEnum: any): string[] =>
Object.values(zodEnum.unwrap().unwrap().enum);

export const flawTypes = extractEnum(zodFlawType);
export const flawSources = extractEnum(zodFlawSource);
export const flawImpacts = extractEnum(zodFlawImpacts);
export const flawIncidentStates = extractEnum(zodFlawMajorIncidentState);
