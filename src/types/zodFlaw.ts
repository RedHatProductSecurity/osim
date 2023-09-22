import {z} from 'zod';
import {
    FlawType,
    ImpactEnum,
    MajorIncidentStateEnum,
    NistCvssValidationEnum,
    RequiresSummaryEnum,
    Source666Enum
} from '../generated-client';
import { DateTime } from 'luxon';

// console.log(Object.values(FlawType));

// const flawTypesWithBlank = (Object.values(FlawType) as string[]).concat('');
const FlawTypeWithBlank = {'': '', ...FlawType,} as const;
const ImpactEnumWithBlank = {'': '',...ImpactEnum} as const;
const RequiresSummaryEnumWithBlank = {'': '',...RequiresSummaryEnum} as const;
const Source666EnumWithBlank = {'': '',...Source666Enum} as const;
const MajorIncidentStateEnumWithBlank = {'': '',...MajorIncidentStateEnum} as const;
const NistCvssValidationEnumWithBlank = {'': '',...NistCvssValidationEnum} as const;

//.transform(o => {if (o as any instanceof Date) return moment(o).toISOString(); else return o;})
//z.string().datetime(), // $date-time,

// const flawTypes: string[] = Object.values(FlawType);
export type ZodFlawType = z.infer<typeof ZodFlawSchema>;
export const ZodFlawSchema = z.object({
    // type: z.nativeEnum(FlawType).optional(),
    type: z.nativeEnum(FlawTypeWithBlank).nullish(),
    cve_id: z.string().nullish(),
    // state: z.string().nullish(), // read-only / XXX deprecated
    // resolution: z.string().nullish(), // read-only / XXX deprecated
    impact: z.nativeEnum(ImpactEnumWithBlank).nullish(),
    component: z.string().max(100).nullish(),
    title: z.string().min(1),
    description: z.string(),
    summary: z.string().nullish(),
    requires_summary: z.nativeEnum(RequiresSummaryEnumWithBlank).nullish(),
    statement: z.string().nullish(),
    cwe_id: z.string().max(255).nullish(),
    unembargo_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    source: z.nativeEnum(Source666EnumWithBlank).nullish(),
    reported_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
    mitigation: z.string().nullish(),
    cvss2: z.string().max(100).nullish(),
    cvss2_score: z.number().nullish(), // $float
    nvd_cvss2: z.string().max(100).nullish(),
    cvss3: z.string().max(100).nullish(),
    cvss3_score: z.number().nullish(), // $float
    nvd_cvss3: z.string().max(100).nullish(),
    // is_major_incident: z.boolean().nullish(), // XXX deprecated
    major_incident_state: z.nativeEnum(MajorIncidentStateEnumWithBlank).nullish(),
    nist_cvss_validation: z.nativeEnum(NistCvssValidationEnumWithBlank).nullish(),
    embargoed: z.boolean(), // technically read-only, but mandatory
    updated_dt: z.date().transform(val => DateTime.fromJSDate(val).toUTC().toISO()).or(z.string().datetime()).nullish(), // $date-time,
});
// Object.values(ZodFlawSchema.shape.type._def.innerType.enum);
// console.log(ZodFlawSchema);
// console.log(Object.keys(ZodFlawSchema.shape.type));
