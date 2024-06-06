import { z } from 'zod';
import {
  AffectednessEnum,
  ResolutionEnum,
  IssuerEnum,
} from '../generated-client';

import { zodOsimDateTime, extractEnum, ImpactEnumWithBlank, ZodFlawClassification } from './zodShared';


const AffectednessEnumWithBlank = { '': '', ...AffectednessEnum } as const;
const ResolutionEnumWithBlank = { '': '', ...ResolutionEnum } as const;

export type ErratumSchemaType = typeof ErratumSchema;
export const ErratumSchema = z.object({
  et_id: z.number(),
  advisory_name: z.string(),
  shipped_dt: z.string().nullable(),
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

export type TrackerSchemaType = typeof TrackerSchema;
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

export type ZodAffectCVSSType = z.infer<typeof AffectCVSSSchema>;
export type AffectCVSSSchemaType = typeof AffectCVSSSchema;
export const AffectCVSSSchema = z.object({
  affect: z.string().uuid().nullish(),
  comment: z.string().nullish(),
  cvss_version: z.string().nullish(),
  issuer: z.nativeEnum(IssuerEnum),
  score: z.number().nullish(),
  uuid: z.string().uuid().nullish(), // read-only
  vector: z.string().nullish(),
  embargoed: z.boolean().nullish(),
  created_dt: zodOsimDateTime().nullish(), // $date-time, // read-only
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

export type ZodAffectType = z.infer<typeof ZodAffectSchema>;
const affectBlueprint = {
  uuid: z.string().uuid().nullish(),
  flaw: z.string().nullish(),
  affectedness: z.nativeEnum(AffectednessEnumWithBlank).nullish(),
  resolution: z.nativeEnum(ResolutionEnumWithBlank).nullish(),
  ps_module: z.string().max(100),
  ps_component: z.string().max(255),
  impact: z.nativeEnum(ImpactEnumWithBlank).nullish(),
  trackers: z.array(TrackerSchema).or(z.array(z.any())),
  meta_attr: z
    .object({
      affectedness: z.string(),
      component: z.string(),
      impact: z.string(),
      module_name: z.string(),
      module_stream: z.string(),
      ps_component: z.string(),
      ps_module: z.string(),
      resolution: z.string(),
    })
    .nullish(),
  delegated_resolution: z.string().nullish(),
  cvss_scores: z.array(AffectCVSSSchema),
  classification: ZodFlawClassification.nullish(),
  embargoed: z.boolean(), // read-only
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
};
export type AffectSchemaType = typeof ZodAffectSchema;
export const ZodAffectSchema = z.object(affectBlueprint);


const {
  impact: zodAffectImpact,
  resolution: zodAffectResolution,
  affectedness: zodAffectAffectedness,
} = ZodAffectSchema.shape;

export const affectImpacts = extractEnum(zodAffectImpact);
export const affectResolutions = extractEnum(zodAffectResolution);
export const affectAffectedness = extractEnum(zodAffectAffectedness);
