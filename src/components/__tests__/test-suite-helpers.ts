/* eslint-disable no-empty-pattern */
import { test } from 'vitest';
import * as sampleFlawRequired from '@test-fixtures/sampleFlawRequired.json';
import * as sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import * as sampleFlawEmpty from '@test-fixtures/sampleFlawEmpty.json';

import { IssuerEnum } from '@/generated-client';
import { CVSS_V3 } from '@/constants';
import type { ZodFlawType, ZodAffectType } from '@/types';

let flaw: null | ZodFlawType = null;
export const osimEmptyFlawTest = test.extend<{ flaw: ZodFlawType }>({
  flaw: async ({}, use) => {
    flaw = structuredClone(sampleFlawEmpty) as ZodFlawType;
    await use(flaw);
    flaw = null;
  },
});

export const osimRequiredFlawTest = test.extend<{ flaw: ZodFlawType }>({
  flaw: async ({}, use) => {
    flaw = structuredClone(sampleFlawRequired) as ZodFlawType;
    await use(flaw);
    flaw = null;
  } });

export const osimFullFlawTest = test.extend<{ flaw: ZodFlawType }>({
  flaw: async ({}, use) => {
    flaw = structuredClone(sampleFlawFull) as ZodFlawType;
    await use(flaw);
    flaw = null;
  },
});

export function osimTestWithFlaw(withFlaw: ZodFlawType) {
  return test.extend<{ flaw: ZodFlawType }>({
    flaw: async ({}, use) => {
      flaw = structuredClone(withFlaw) as ZodFlawType;
      await use(flaw);
      flaw = null;
    },
  });
}

export function mockAffect({ ps_component, ps_module }: { ps_component: string; ps_module: string }): ZodAffectType {
  return {
    ps_module,
    ps_component,
    embargoed: false,
    trackers: [],
    alerts: [],
    cvss_scores: [{
      comment: 'hardcoded comment',
      created_dt: null,
      cvss_version: CVSS_V3,
      embargoed: false,
      issuer: IssuerEnum.Rh,
      score: null,
      uuid: null,
      vector: null,
      alerts: [],
    },
    ],
  };
}
