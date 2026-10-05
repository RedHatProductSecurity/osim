import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KpiObservation } from '@/utils/kpi';
import { createKpiCsv, downloadKpiCsv, type KpiReportScope } from '@/utils/kpiReport';

const scope: KpiReportScope = {
  bot: null,
  component: 'kernel',
  feature: 'suggest-impact',
  versions: ['0.9.2', ''],
  fromDate: '2026-09-01',
  toDate: '2026-09-30',
};
const observation: KpiObservation = {
  source: 'manual',
  outcome: 'feedback',
  accepted: true,
  feature: 'suggest-impact',
  version: '0.9.2',
  datetime: '2026-09-01 12:00:00',
};

describe('kPI CSV reports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('exports weighted summary, source breakdowns, weekly rates and the exact filter scope', () => {
    const csv = createKpiCsv([
      observation,
      { ...observation, source: 'programmatic', accepted: false },
      { ...observation, source: 'osidb-bot', outcome: 'suggested', cveId: 'CVE-2026-1000' },
      { ...observation, source: 'osidb-bot', outcome: 'skipped', accepted: null, cveId: 'CVE-2026-1000' },
    ], scope);
    const lines = csv.split('\r\n');
    const overall = lines.find(line => line.startsWith('"summary","combined","all"'))!;
    expect(overall).toContain('"kernel","suggest-impact","0.9.2; Unknown version"');
    expect(overall).toContain('"2026-09-01T00:00:00.000Z","2026-09-30T23:59:59.999Z"');
    expect(overall).toContain('"2","3","66.7","1","1","1","0","1"');
    expect(lines.some(line => line.startsWith('"weekly","combined","suggest-impact","2026-08-31"'))).toBe(true);
    expect(lines.some(line => line.startsWith('"summary","programmatic"'))).toBe(true);
  });

  it('escapes quotes, commas, line breaks and formula-like filter text', () => {
    const csv = createKpiCsv([observation], { ...scope, component: '=SUM(1,2)\n"kernel"' });
    expect(csv).toContain('"\'=SUM(1,2)\n""kernel"""');
  });

  it('keeps undated and unscored records in summaries without inventing weekly points or zero rates', () => {
    const csv = createKpiCsv([{ ...observation, accepted: null, datetime: null }], scope);
    expect(csv).not.toContain('"weekly"');
    expect(csv).toContain('"0","0",""');
    expect(csv).not.toMatch(/NaN|Infinity/);
  });

  it('includes displayed bot features with zero observations and respects the feature filter', () => {
    const bot = {
      entries: [],
      available_components: [],
      total_flaws_processed: 0,
      features: { title: {
        suggested: 0,
        skipped: 0,
        kept: 0,
        modified: 0,
        acceptance_rate: 0,
        avg_data_quality: null,
        avg_confidence: null,
        avg_suggestion_deviation: null,
      } },
    };
    const csv = createKpiCsv([observation], { ...scope, feature: 'all', bot });
    expect(csv).toContain('"summary","osidb-bot","suggest-title"');
    expect(createKpiCsv([observation], { ...scope, bot })).not.toContain('"suggest-title"');
  });

  it('downloads a CSV blob and releases its object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:kpi-report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('aegis-kpi-report.csv');
      expect(this.getAttribute('href')).toBe('blob:kpi-report');
    });
    downloadKpiCsv('report');
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:kpi-report');
  });
});
