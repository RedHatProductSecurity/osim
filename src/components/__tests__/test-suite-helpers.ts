import { test } from 'vitest';

import type { ZodAffectType } from '@/types/zodAffect';
import type { ZodFlawType } from '@/types/zodFlaw';
import { IssuerEnum } from '@/generated-client';

import sampleFlawEmpty from './__fixtures__/sampleFlawEmpty.json';
import sampleFlawRequired from './__fixtures__/sampleFlawRequired.json';
import sampleFlawFull from './__fixtures__/sampleFlawFull.json';

let flaw: null | ZodFlawType = null;
export const osimEmptyFlawTest = test.extend<{ flaw: ZodFlawType }>({
  // eslint-disable-next-line no-empty-pattern
  flaw: async ({}, use) => {
    flaw = structuredClone(sampleFlawEmpty) as ZodFlawType;

    await use(flaw);

    flaw = null;
  } });

export const osimRequiredFlawTest = test.extend<{ flaw: ZodFlawType }>({
  // eslint-disable-next-line no-empty-pattern
  flaw: async ({}, use) => {
    flaw = structuredClone(sampleFlawRequired) as ZodFlawType;

    await use(flaw);

    flaw = null;
  } });

export const osimFullFlawTest = test.extend<{ flaw: ZodFlawType }>({
  // eslint-disable-next-line no-empty-pattern
  flaw: async ({}, use) => {
    flaw = structuredClone(sampleFlawFull) as ZodFlawType;

    await use(flaw);

    flaw = null;
  },
});

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
      cvss_version: 'V3',
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
