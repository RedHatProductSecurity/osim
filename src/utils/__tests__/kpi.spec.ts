import { describe, expect, it } from 'vitest';

import type { AegisBotKpiEntry } from '@/types/aegisAI';
import { botObservations, compareKpiVersions, feedbackObservations, kpiHistory, summarizeKpi } from '@/utils/kpi';

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
  it('sorts versions numerically with prereleases before releases and unknown versions last (OSIDB-5200)', () => {
    const versions = ['0.7.5',
      '',
      '0.7.3',
      '0.7.10',
      '0.7.4',
      '0.10.0',
      '0.10.0-rc.10',
      '0.10.0-rc.2',
      '0.10.0+build.10',
      '0.10.0+build.2'];
    expect(versions.sort(compareKpiVersions)).toEqual([
      '0.7.3',
      '0.7.4',
      '0.7.5',
      '0.7.10',
      '0.10.0-rc.2',
      '0.10.0-rc.10',
      '0.10.0',
      '0.10.0+build.2',
      '0.10.0+build.10',
      '',
    ]);
  });

  it('sorts weeks across features and year boundaries and keeps series aligned (OSIDB-5200)', () => {
    const observations = botObservations([
      record({ cve_id: 'CVE-2026-1001', datetime: '2026-07-01T00:00:00Z' }),
      record({ cve_id: 'CVE-2026-1002', datetime: '2026-05-12T00:00:00Z' }),
      record({ cve_id: 'CVE-2026-1003', datetime: '2026-05-01T00:00:00Z', feature: 'cwe_id' }),
      record({ cve_id: 'CVE-2026-1004', datetime: '2026-01-01T00:00:00Z', feature: 'cwe_id', deviation: 1 }),
      record({ cve_id: 'CVE-2025-1005', datetime: '2025-12-31 23:30:00-02:00' }),
    ]);
    const history = kpiHistory(observations);
    expect(history.weeks[0]).toBe('2025-12-29');
    expect(history.weeks.at(-1)).toBe('2026-06-29');
    expect(history.weeks).toEqual([...history.weeks].sort());
    const populatedWeeks = ['2025-12-29', '2026-04-27', '2026-05-11', '2026-06-29'];
    expect(populatedWeeks.map(week => history.dataset[0].series[history.weeks.indexOf(week)]))
      .toEqual([100, null, 100, 100]);
    expect(populatedWeeks.map(week => history.dataset[1].series[history.weeks.indexOf(week)]))
      .toEqual([0, 100, null, null]);
    expect(history.dataset[0].series[history.weeks.indexOf('2026-05-04')]).toBeNull();
  });

  it('orders mixed semantic and custom build formats consistently regardless of arrival order', () => {
    const versions = ['v0.7.3', '0.7.4', '0.7.5.dev0', ''];
    for (let offset = 0; offset < versions.length; offset++) {
      const rotated = [...versions.slice(offset), ...versions.slice(0, offset)];
      expect(rotated.sort(compareKpiVersions)).toEqual(versions);
      expect(rotated.toReversed().sort(compareKpiVersions)).toEqual(versions);
    }
  });
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
