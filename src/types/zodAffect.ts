import { z } from 'zod';
import {
  AffectednessEnum,
  ResolutionEnum,
  IssuerEnum,
} from '../generated-client';

import { zodOsimDateTime, ImpactEnumWithBlank, ZodFlawClassification, ZodAlertSchema } from './zodShared';
import { omit, pick } from 'ramda';
import type { ValueOf } from '@/utils/typeHelpers';

const AffectednessEnumWithBlank = { 'Empty': '', ...AffectednessEnum } as const;
const ResolutionEnumWithBlank = { 'Empty': '', ...ResolutionEnum } as const;

export const affectImpacts = { ...omit([''], ImpactEnumWithBlank), Empty: '' } as const;
export const affectResolutions = ResolutionEnumWithBlank;
export const affectAffectedness = AffectednessEnumWithBlank;

type PossibleResolutions = Record<AffectednessEnum, Partial<typeof ResolutionEnumWithBlank>>;

export function possibleAffectResolutions(impact?: ValueOf<typeof affectImpacts> | null): PossibleResolutions {
  const pickResolution = (options: (keyof typeof ResolutionEnumWithBlank)[], resolutions: typeof affectResolutions) => {
    const possibleResolutions = options.filter(option => (
      impact === affectImpacts.Low && option === 'Defer' || option !== 'Defer'
    ));
    return pick(possibleResolutions, resolutions);
  };

  return {
    AFFECTED: pickResolution(['Delegated', 'Defer', 'Wontfix', 'Ooss'], affectResolutions),
    NEW: pickResolution(['Empty', 'Defer', 'Wontfix', 'Ooss'], affectResolutions),
    NOTAFFECTED: pickResolution(['Empty'], affectResolutions),
  };
}


export type ErratumSchemaType = typeof ErratumSchema;
export const ErratumSchema = z.object({
  et_id: z.number(),
  advisory_name: z.string(),
  shipped_dt: z.string().nullable(),
  created_dt: zodOsimDateTime().nullish(), // $date-time,
  updated_dt: zodOsimDateTime().nullish(), // $date-time,
});

export type ZodTrackerType = z.infer<typeof TrackerSchema>;
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
  alerts: z.array(ZodAlertSchema).default([]),
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
  alerts: z.array(ZodAlertSchema).default([]),
});

export type ZodAffectType = z.infer<typeof ZodAffectSchema>;
export type AffectSchemaType = typeof ZodAffectSchema;
export const ZodAffectSchema = z.object({
  uuid: z.string().uuid().nullish(),
  flaw: z.string().nullish(),
  affectedness: z.nativeEnum(AffectednessEnumWithBlank).nullish(),
  resolution: z.nativeEnum(ResolutionEnumWithBlank).nullish(),
  ps_module: z.string().max(100),
  ps_component: z.string().max(255),
  ps_product: z.string().nullish(),
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
  alerts: z.array(ZodAlertSchema).default([]),
});
