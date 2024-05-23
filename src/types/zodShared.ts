import { z } from 'zod';
import { DateTime } from 'luxon';
import type {
  FlawCVSSSchemaType,
  FlawSchemaType,
  FlawMetaSchemaType,
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
  | FlawMetaSchemaType
  | typeof ZodFlawClassification;

type SchemaTypeWithEffect = SchemaType | FlawSchemaType;

export const fieldsFor = (schema: SchemaTypeWithEffect) => schema._def.typeName === 'ZodEffects'
  ? Object.keys(schema._def.schema.shape)
  : Object.keys((schema as SchemaType).shape);

export const extractEnum = (zodEnum: any): string[] => Object.values(zodEnum.unwrap().unwrap().enum);
