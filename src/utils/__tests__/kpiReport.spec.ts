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

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  for (const match of csv.matchAll(/"((?:""|[^"])*)"(,|\r\n)/gs)) {
    row.push(match[1].replaceAll('""', '"'));
    if (match[2] === '\r\n') {
      rows.push(row);
      row = [];
    }
  }
  return rows;
}

describe('kPI CSV reports', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('exports weekly records beside contextual aggregate key/value entries without row types', () => {
    const rows = parseCsv(createKpiCsv([
      observation,
      { ...observation, source: 'programmatic', accepted: false },
      { ...observation, source: 'osidb-bot', outcome: 'suggested', cveId: 'CVE-2026-1000' },
      { ...observation, source: 'osidb-bot', outcome: 'skipped', accepted: null, cveId: 'CVE-2026-1000' },
    ], scope));
    const [header, ...records] = rows;

    expect(header).not.toContain('row_type');
    expect(header.slice(-2)).toEqual(['total_category', 'total_amount']);
    expect(header).toEqual([
      'source',
      'feature',
      'week_start_utc',
      'component_filter',
      'feature_filter',
      'version_filter',
      'from_utc',
      'through_utc',
      'accepted_or_kept',
      'scored',
      'acceptance_percentage',
      'bot_suggested',
      'bot_skipped',
      'bot_kept',
      'bot_modified',
      'processed_flaws',
      'avg_data_quality',
      'avg_confidence',
      'avg_suggestion_deviation',
      'total_category',
      'total_amount',
    ]);

    const weekly = records.find(record => record[0] === 'combined' && record[1] === 'suggest-impact')!;
    expect(weekly.slice(0, 8)).toEqual([
      'combined',
      'suggest-impact',
      '2026-08-31',
      'kernel',
      'suggest-impact',
      '0.9.2; Unknown version',
      '2026-09-01T00:00:00.000Z',
      '2026-09-30T23:59:59.999Z',
    ]);
    expect(weekly.slice(8, 19)).toEqual(['2', '3', '66.7', '1', '1', '1', '0', '1', '', '', '']);

    const totals = new Map(records.map(record => [record[19], record[20]]));
    expect(Object.fromEntries([...totals].filter(([category]) => category.startsWith('combined / all /'))))
      .toEqual({
        'combined / all / accepted_or_kept': '2',
        'combined / all / scored': '3',
        'combined / all / acceptance_percentage': '66.7',
        'combined / all / bot_suggested': '1',
        'combined / all / bot_skipped': '1',
        'combined / all / bot_kept': '1',
        'combined / all / bot_modified': '0',
        'combined / all / processed_flaws': '1',
      });
    expect(totals.get('programmatic / suggest-impact / accepted_or_kept')).toBe('0');
  });

  it('preserves bot quality aggregates and respects the feature filter', () => {
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
        avg_data_quality: 0.8,
        avg_confidence: 0.7,
        avg_suggestion_deviation: 0.2,
      } },
    };
    const allFeatureRows = parseCsv(createKpiCsv([observation], { ...scope, feature: 'all', bot }));
    const totals = new Map(allFeatureRows.slice(1).map(record => [record[19], record[20]]));

    expect(totals.get('osidb-bot / suggest-title / avg_data_quality')).toBe('0.8');
    expect(totals.get('osidb-bot / suggest-title / avg_confidence')).toBe('0.7');
    expect(totals.get('osidb-bot / suggest-title / avg_suggestion_deviation')).toBe('0.2');
    expect(createKpiCsv([observation], { ...scope, bot })).not.toContain('suggest-title');
  });

  it('leaves weekly cells blank when aggregate entries outlast weekly records', () => {
    const records = parseCsv(createKpiCsv([
      { ...observation, accepted: null, datetime: null },
    ], scope)).slice(1);

    expect(records.length).toBeGreaterThan(0);
    expect(records.every(record => record.slice(0, 19).every(cell => cell === ''))).toBe(true);
    expect(records.some(record => record[19] === 'combined / all / scored' && record[20] === '0')).toBe(true);
    expect(records.some(record => record[19].endsWith('/ acceptance_percentage'))).toBe(false);
  });

  it('leaves aggregate cells blank when weekly records outlast aggregate entries', () => {
    const observations = Array.from({ length: 17 }, (_, index): KpiObservation => ({
      ...observation,
      datetime: `${new Date(Date.UTC(2026, 0, 5 + index * 7)).toISOString().slice(0, 10)} 12:00:00`,
    }));
    const records = parseCsv(createKpiCsv(observations, scope)).slice(1);

    expect(records).toHaveLength(34);
    expect(records.slice(-2).every(record => record[0] !== '' && record.slice(-2).every(cell => cell === '')))
      .toBe(true);
  });

  it('escapes quotes, commas, line breaks and formula-like filter text', () => {
    const rows = parseCsv(createKpiCsv([observation], { ...scope, component: '=SUM(1,2)\n"kernel"' }));
    const weekly = rows.slice(1).find(record => record[0] === 'combined')!;

    expect(weekly[3]).toBe('\'=SUM(1,2)\n"kernel"');
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
    const blob = createObjectURL.mock.calls[0][0];

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:kpi-report');
  });
});
