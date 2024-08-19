import type { ZodFlawCVSSType } from '@/types/zodFlaw';

export function sampleFlawCvssScores_1(flawId: string): ZodFlawCVSSType[] {
  return [
    {
      comment: 'The CVSS is as it is and that is it.',
      cvss_version: 'V3',
      flaw: flawId,
      issuer: 'RH',
      score: 2.2,
      uuid: 'cvsss-beeeep',
      vector: 'CVSS:3.1/AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:N/A:N',
      embargoed: false,
      created_dt: '2021-08-02T10:49:35Z',
      updated_dt: '2024-03-04T14:27:02Z',
      alerts: [],
    },
    {
      comment: 'The CVSS is as it is and that is it.',
      cvss_version: 'V3',
      flaw: flawId,
      issuer: 'NIST',
      score: 4,
      uuid: 'cvsss-beeeep',
      vector: 'CVSS:3.1/AV:N/AC:H/PR:E/UI:N/S:U/C:N/I:L/A:R',
      embargoed: false,
      created_dt: '2021-08-02T10:49:35Z',
      updated_dt: '2024-03-04T14:27:02Z',
      alerts: [],
    },
  ];
}
