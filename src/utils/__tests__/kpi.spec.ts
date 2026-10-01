import { describe, expect, it } from 'vitest';

import type { AegisBotKpiEntry } from '@/types/aegisAI';
import { botObservations, feedbackObservations, kpiHistory, summarizeKpi } from '@/utils/kpi';

const record = (overrides: Partial<AegisBotKpiEntry> = {}): AegisBotKpiEntry => ({
  cve_id: 'CVE-2026-1000',
  feature: 'impact',
  datetime: '2026-09-01T00:00:00Z',
  aegis_version: '',
  type: 'AI-Bot',
  deviation: 0,
  data_quality: null,
  confidence: null,
  ...overrides,
});

describe('kPI aggregation', () => {
  it('counts repeated bot suggestions/skips once and uses the latest comparison', () => {
    const observations = botObservations([
      record(),
      record({ deviation: 1 }),
      record({ type: 'AI-Bot-Skipped', deviation: null }),
      record({ type: 'AI-Bot-Skipped', deviation: null }),
    ]);
    expect(summarizeKpi(observations)).toEqual({
      accepted: 0, total: 1, percentage: 0, suggested: 1, skipped: 1, processedFlaws: 1,
    });
    expect(observations[0].feature).toBe('suggest-impact');
  });

  it('does not compare an older scored suggestion when the latest is unscored', () => {
    const observations = botObservations([record(), record({ deviation: null })]);
    expect(summarizeKpi(observations)).toMatchObject({ total: 0, percentage: null, suggested: 1 });
  });

  it('weights combined rates by scored counts and retains independent sources for the same CVE', () => {
    const feedback = feedbackObservations({
      cve_description: { acceptance_percentage: 0,
        entries: [
          { cve_id: 'CVE-2026-1000', accepted: false, aegis_version: '0.9.2', datetime: '2026-09-01 00:00:00' },
        ] },
    });
    const observations = [...feedback, ...botObservations([record(), record({ cve_id: 'CVE-2026-1001' })])];
    expect(feedback[0].feature).toBe('suggest-description');
    expect(summarizeKpi(observations).percentage).toBeCloseTo(200 / 3);
  });

  it('aligns sparse feature series and excludes undated observations only from history', () => {
    const observations = botObservations([
      record(),
      record({ cve_id: 'CVE-2026-1001', feature: 'cwe_id', datetime: '2026-09-09T00:00:00Z' }),
      record({ cve_id: 'CVE-2026-1002', datetime: null }),
    ]);
    expect(summarizeKpi(observations).total).toBe(3);
    const history = kpiHistory(observations);
    expect(history.weeks).toEqual(['2026-08-31', '2026-09-07']);
    expect(history.dataset.map(series => series.series)).toEqual([[100, null], [null, 100]]);
  });
});
