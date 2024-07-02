import type { ZodAffectType } from '@/types/zodAffect';

export function mockAffect ({ ps_module, ps_component }: { ps_module: string, ps_component: string }): ZodAffectType {
  return {
    uuid: 'uuid',
    ps_module,
    ps_component,
    embargoed:false,
    trackers:[],
    alerts: [],
    cvss_scores: [{
      comment: 'hardcoded comment',
      created_dt: null,
      cvss_version: 'V3',
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
