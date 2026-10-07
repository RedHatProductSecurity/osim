import type { AegisBotKpiMetrics } from '@/types/aegisAI';
import { canonicalKpiFeature, kpiVersionLabel, kpiWeek, summarizeKpi, type KpiObservation } from '@/utils/kpi';

export type KpiReportScope = {
  bot: AegisBotKpiMetrics | null;
  component: string;
  feature: string;
  fromDate: string;
  toDate: string;
  versions: string[];
};

function csvCell(value: null | number | string | undefined) {
  let text = value == null ? '' : String(value);
  // Quoting alone does not prevent spreadsheet formula evaluation.
  if (/^\s*[=+@-]|^[\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function reportGroups(observations: KpiObservation[]) {
  const groups = new Map<string, { entries: KpiObservation[]; feature: string; source: string; week: string }>();
  for (const entry of observations) {
    const week = kpiWeek(entry.datetime);
    const keys = [
      ['', 'combined', 'all'],
      ['', 'combined', entry.feature],
      ['', entry.source, 'all'],
      ['', entry.source, entry.feature],
      ...(week ? [[week, 'combined', entry.feature], [week, entry.source, entry.feature]] : []),
    ];
    for (const [week, source, feature] of keys) {
      const key = JSON.stringify([week, source, feature]);
      if (!groups.has(key)) groups.set(key, { entries: [], week, source, feature });
      groups.get(key)!.entries.push(entry);
    }
  }
  return [...groups.values()];
}

export function createKpiCsv(observations: KpiObservation[], scope: KpiReportScope) {
  const header = [
    'row_type',
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
  ];
  const botFeatures = Object.fromEntries(Object.entries(scope.bot?.features ?? {})
    .map(([feature, metrics]) => [canonicalKpiFeature(feature), metrics]));
  const groups = reportGroups(observations);
  for (const feature of Object.keys(botFeatures)) {
    if (scope.feature !== 'all' && scope.feature !== feature) continue;
    if (!groups.some(group => !group.week && group.source === 'osidb-bot' && group.feature === feature)) {
      groups.push({ entries: [], feature, source: 'osidb-bot', week: '' });
    }
  }
  const rows = groups.map(({ entries, feature, source, week }) => {
    const metrics = summarizeKpi(entries);
    const botMetrics = summarizeKpi(entries.filter(entry => entry.source === 'osidb-bot'));
    const quality = !week && source === 'osidb-bot' ? botFeatures[feature] : undefined;
    const processed = !week && feature === 'all' && scope.feature === 'all'
      && ['combined', 'osidb-bot'].includes(source)
      ? scope.bot?.total_flaws_processed ?? 0
      : metrics.processedFlaws;
    return [
      week ? 'weekly' : 'summary',
      source,
      feature,
      week,
      scope.component || 'All',
      scope.feature,
      scope.versions.length ? scope.versions.map(kpiVersionLabel).join('; ') : 'All',
      scope.fromDate ? `${scope.fromDate}T00:00:00.000Z` : '',
      scope.toDate ? `${scope.toDate}T23:59:59.999Z` : '',
      metrics.accepted,
      metrics.total,
      metrics.percentage?.toFixed(1),
      metrics.suggested,
      metrics.skipped,
      botMetrics.accepted,
      botMetrics.total - botMetrics.accepted,
      processed,
      quality?.avg_data_quality,
      quality?.avg_confidence,
      quality?.avg_suggestion_deviation,
    ];
  });
  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function downloadKpiCsv(csv: string) {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aegis-kpi-report.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
