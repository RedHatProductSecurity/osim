import { test } from 'vitest';

import { CVSS_V3 } from '@/constants';
import type { ZodFlawType, ZodAffectType } from '@/types';

import sampleFlawEmpty from './__fixtures__/sampleFlawEmpty.json';
import sampleFlawRequired from './__fixtures__/sampleFlawRequired.json';
import sampleFlawFull from './__fixtures__/sampleFlawFull.json';

export const osimEmptyFlawTest = test.extend({
  flaw: sampleFlawEmpty as ZodFlawType,
});

export const osimRequiredFlawTest = test.extend({
  flaw: sampleFlawRequired as ZodFlawType,
});

export const osimFullFlawTest = test.extend({
  flaw: sampleFlawFull as ZodFlawType,
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
