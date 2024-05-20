import { z } from 'zod';
import { DateTime } from 'luxon';
import type {
  FlawCVSSSchemaType,
  FlawSchemaType,
} from './zodFlaw';
import type {
  AffectSchemaType,
  TrackerSchemaType,
  ErratumSchemaType,
  AffectCVSSSchemaType,
} from './zodAffect';

import { ImpactEnum } from '@/generated-client';

import {
  FlawClassificationStateEnum
} from '../generated-client';

export const ZodFlawClassification = z.object({
  workflow: z.string(),
  state: z.nativeEnum(FlawClassificationStateEnum),
});

export const ImpactEnumWithBlank = { '': '', ...ImpactEnum } as const;

export const zodOsimDateTime = () =>
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

type SchemaType =
  | FlawCVSSSchemaType
  | AffectCVSSSchemaType
  | ErratumSchemaType
  | TrackerSchemaType
  | AffectSchemaType
  | typeof ZodFlawClassification;

type SchemaTypeWithEffect = SchemaType | FlawSchemaType;

export type ZodAlertType = z.infer<typeof ZodAlertSchema>;
export const ZodAlertSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  alert_type: z.enum(['ERROR', 'WARNING']),
  resolution_steps: z.string().nullish(),
  parent_uuid: z.string().uuid(),
  parent_model: z.string(),
});

export const fieldsFor = (schema: SchemaTypeWithEffect) => schema._def.typeName === 'ZodEffects'
  ? Object.keys(schema._def.schema.shape)
  : Object.keys((schema as SchemaType).shape);

export const extractEnum = (zodEnum: any): string[] => Object.values(zodEnum.unwrap().unwrap().enum);
