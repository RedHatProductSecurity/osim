import { test } from 'vitest';

import type { ZodAffectType } from '@/types/zodAffect';
import { CVSS_V3 } from '@/constants';

import sampleFlawEmpty from './__fixtures__/sampleFlawEmpty.json';
import sampleFlawRequired from './__fixtures__/sampleFlawRequired.json';
import sampleFlawFull from './__fixtures__/sampleFlawFull.json';

export const osimEmptyFlawTest = test.extend({
  flaw: sampleFlawEmpty,
});

export const osimRequiredFlawTest = test.extend({
  flaw: sampleFlawRequired,
});

export const osimFullFlawTest = test.extend({
  flaw: sampleFlawFull,
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
      cvss_version: CVSS_V3,
      embargoed: false,
      issuer: 'RH',
      score: null,
      uuid: null,
      vector: null,
      alerts: [],
    },
    ],
  };
}
