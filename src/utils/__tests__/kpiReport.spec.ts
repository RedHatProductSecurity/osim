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
      'feedback_accepted',
      'feedback_rejected',
      'feedback_scored',
      'feedback_acceptance_pct',
      'bot_suggested',
      'bot_skipped',
      'bot_kept',
      'bot_modified',
      'bot_scored',
      'bot_keep_pct',
      'overall_acceptance_pct',
      'bot_processed_flaws',
      'bot_avg_data_quality',
      'bot_avg_confidence',
      'bot_avg_suggestion_deviation',
      'total_category',
      'total_amount',
    ]);

    const weekly = records.find(record => record[0] === 'all' && record[1] === 'suggest-impact')!;
    expect(weekly.slice(0, 8)).toEqual([
      'all',
      'suggest-impact',
      '2026-08-31',
      'kernel',
      'suggest-impact',
      '0.9.2; Unknown version',
      '2026-09-01T00:00:00.000Z',
      '2026-09-30T23:59:59.999Z',
    ]);
    expect(weekly.slice(8, 23)).toEqual([
      '1', '1', '2', '50.0', '1', '1', '1', '0', '1', '100.0', '66.7', '1', '', '', '',
    ]);

    const totals = new Map(records.map(record => [record[23], record[24]]));
    expect(Object.fromEntries([...totals].filter(([category]) => category.startsWith('all / all /'))))
      .toEqual({
        'all / all / feedback_accepted': '1',
        'all / all / feedback_rejected': '1',
        'all / all / feedback_scored': '2',
        'all / all / feedback_acceptance_pct': '50.0',
        'all / all / bot_suggested': '1',
        'all / all / bot_skipped': '1',
        'all / all / bot_kept': '1',
        'all / all / bot_modified': '0',
        'all / all / bot_scored': '1',
        'all / all / bot_keep_pct': '100.0',
        'all / all / overall_acceptance_pct': '66.7',
        'all / all / bot_processed_flaws': '1',
      });
    expect(totals.get('requested_by_user / suggest-impact / feedback_accepted')).toBe('0');
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
    const totals = new Map(allFeatureRows.slice(1).map(record => [record[23], record[24]]));

    expect(totals.get('osidb_bot / suggest-title / bot_avg_data_quality')).toBe('0.8');
    expect(totals.get('osidb_bot / suggest-title / bot_avg_confidence')).toBe('0.7');
    expect(totals.get('osidb_bot / suggest-title / bot_avg_suggestion_deviation')).toBe('0.2');
    // The filler row counts zero-scored bot outcomes but leaves the rate blank on 0/0.
    expect(totals.get('osidb_bot / suggest-title / bot_scored')).toBe('0');
    expect([...totals.keys()].some(category => category.endsWith('/ bot_keep_pct'))).toBe(false);
    expect(createKpiCsv([observation], { ...scope, bot })).not.toContain('suggest-title');
  });

  it('leaves weekly cells blank when aggregate entries outlast weekly records', () => {
    const records = parseCsv(createKpiCsv([
      { ...observation, accepted: null, datetime: null },
    ], scope)).slice(1);

    expect(records.length).toBeGreaterThan(0);
    expect(records.every(record => record.slice(0, 23).every(cell => cell === ''))).toBe(true);
    expect(records.some(record => record[23] === 'all / all / feedback_scored' && record[24] === '0')).toBe(true);
    expect(records.some(record => record[23] === 'all / all / bot_scored' && record[24] === '0')).toBe(true);
    expect(records.some(record => record[23].endsWith('/ feedback_acceptance_pct'))).toBe(false);
    expect(records.some(record => record[23].endsWith('/ overall_acceptance_pct'))).toBe(false);
  });

  it('leaves aggregate cells blank when weekly records outlast aggregate entries', () => {
    const observations = Array.from({ length: 17 }, (_, index): KpiObservation => ({
      ...observation,
      datetime: `${new Date(Date.UTC(2026, 0, 5 + index * 7)).toISOString().slice(0, 10)} 12:00:00`,
    }));
    const records = parseCsv(createKpiCsv(observations, scope)).slice(1);

    expect(records).toHaveLength(34);
    expect(records.slice(-4).every(record => record[0] !== '' && record.slice(-2).every(cell => cell === '')))
      .toBe(true);
  });

  it('escapes quotes, commas, line breaks and formula-like filter text', () => {
    const rows = parseCsv(createKpiCsv([observation], { ...scope, component: '=SUM(1,2)\n"kernel"' }));
    const weekly = rows.slice(1).find(record => record[0] === 'all')!;

    expect(weekly[3]).toBe('\'=SUM(1,2)\n"kernel"');
  });

  it('maps sources to channels and fills only the columns that apply per row type', () => {
    const rows = parseCsv(createKpiCsv([
      observation,
      { ...observation, source: 'manual' },
      { ...observation, source: 'programmatic', accepted: false },
      { ...observation, source: 'feedback', accepted: null },
      { ...observation, source: 'osidb-bot', outcome: 'suggested', cveId: 'CVE-2026-1000' },
      { ...observation, source: 'osidb-bot', outcome: 'suggested', accepted: false, cveId: 'CVE-2026-1001' },
      { ...observation, source: 'osidb-bot', outcome: 'skipped', accepted: null, cveId: 'CVE-2026-1000' },
    ], scope));
    const weekly = new Map(rows.slice(1)
      .filter(record => record[2])
      .map(record => [record[0], record.slice(8, 23)]));

    expect([...weekly.keys()].sort())
      .toEqual(['all', 'google_form', 'legacy_manual', 'osidb_bot', 'requested_by_user']);
    expect(weekly.get('all'))
      .toEqual(['2', '1', '3', '66.7', '2', '1', '1', '1', '2', '50.0', '60.0', '2', '', '', '']);
    expect(weekly.get('legacy_manual'))
      .toEqual(['2', '0', '2', '100.0', '', '', '', '', '', '', '', '', '', '', '']);
    expect(weekly.get('requested_by_user'))
      .toEqual(['0', '1', '1', '0.0', '', '', '', '', '', '', '', '', '', '', '']);
    // Unmarked feedback is exported as google_form: the counts apply, the rate stays blank on 0/0.
    expect(weekly.get('google_form'))
      .toEqual(['0', '0', '0', '', '', '', '', '', '', '', '', '', '', '', '']);
    expect(weekly.get('osidb_bot'))
      .toEqual(['', '', '', '', '2', '1', '1', '1', '2', '50.0', '', '2', '', '', '']);

    // The overall rate belongs to the combined view only, never to a single channel.
    const categories = rows.slice(1).map(record => record[23]).filter(Boolean);
    expect(categories.filter(category => category.endsWith('/ overall_acceptance_pct')))
      .toEqual(['all / all / overall_acceptance_pct', 'all / suggest-impact / overall_acceptance_pct']);
  });

  it('derives bot_processed_flaws from group observations instead of the backend selection total', () => {
    const bot = { entries: [], available_components: [], total_flaws_processed: 42, features: {} };
    const csv = createKpiCsv([
      observation,
      { ...observation, source: 'osidb-bot', outcome: 'suggested', cveId: 'CVE-2026-1000' },
      { ...observation, source: 'osidb-bot', outcome: 'suggested', accepted: false, cveId: 'CVE-2026-1001' },
      { ...observation, source: 'osidb-bot', outcome: 'skipped', accepted: null, cveId: 'CVE-2026-1002' },
    ], { ...scope, feature: 'all', bot });
    const records = parseCsv(csv).slice(1);
    const totals = new Map(records.map(record => [record[23], record[24]]));

    expect(totals.get('all / all / bot_processed_flaws')).toBe('3');
    expect(totals.get('all / suggest-impact / bot_processed_flaws')).toBe('3');
    expect(totals.get('osidb_bot / all / bot_processed_flaws')).toBe('3');
    expect(totals.get('osidb_bot / suggest-impact / bot_processed_flaws')).toBe('3');
    expect(records.find(record => record[0] === 'all' && record[2])![19]).toBe('3');
    expect(records.find(record => record[0] === 'osidb_bot' && record[2])![19]).toBe('3');
    expect(csv).not.toContain('42');
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
