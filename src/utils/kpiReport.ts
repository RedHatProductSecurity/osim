import type { AegisBotKpiMetrics } from '@/types/aegisAI';
import {
  canonicalKpiFeature, kpiSourceChannel, kpiVersionLabel, kpiWeek, summarizeKpi, type KpiObservation,
} from '@/utils/kpi';

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
    const source = kpiSourceChannel(entry.source);
    const keys = [
      ['', 'all', 'all'],
      ['', 'all', entry.feature],
      ['', source, 'all'],
      ['', source, entry.feature],
      ...(week ? [[week, 'all', entry.feature], [week, source, entry.feature]] : []),
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
  ];
  const botFeatures = Object.fromEntries(Object.entries(scope.bot?.features ?? {})
    .map(([feature, metrics]) => [canonicalKpiFeature(feature), metrics]));
  const groups = reportGroups(observations);
  for (const feature of Object.keys(botFeatures)) {
    if (scope.feature !== 'all' && scope.feature !== feature) continue;
    if (!groups.some(group => !group.week && group.source === 'osidb_bot' && group.feature === feature)) {
      groups.push({ entries: [], feature, source: 'osidb_bot', week: '' });
    }
  }
  // A column is filled only where it applies: feedback columns on feedback
  // channels and all-rows, bot columns on the bot channel and all-rows, and
  // the overall rate only on all-rows. Blank means not applicable.
  const reportValues = ({ entries, feature, source, week }: typeof groups[number]) => {
    const feedbackMetrics = summarizeKpi(entries.filter(entry => entry.source !== 'osidb-bot'));
    const botMetrics = summarizeKpi(entries.filter(entry => entry.source === 'osidb-bot'));
    const overallMetrics = summarizeKpi(entries);
    const isAll = source === 'all';
    const isBot = source === 'osidb_bot';
    const includeFeedback = isAll || !isBot;
    const includeBot = isAll || isBot;
    const quality = !week && isBot ? botFeatures[feature] : undefined;
    return {
      metrics: [
        includeFeedback ? feedbackMetrics.accepted : undefined,
        includeFeedback ? feedbackMetrics.total - feedbackMetrics.accepted : undefined,
        includeFeedback ? feedbackMetrics.total : undefined,
        includeFeedback ? feedbackMetrics.percentage?.toFixed(1) : undefined,
        includeBot ? botMetrics.suggested : undefined,
        includeBot ? botMetrics.skipped : undefined,
        includeBot ? botMetrics.accepted : undefined,
        includeBot ? botMetrics.total - botMetrics.accepted : undefined,
        includeBot ? botMetrics.total : undefined,
        includeBot ? botMetrics.percentage?.toFixed(1) : undefined,
        isAll ? overallMetrics.percentage?.toFixed(1) : undefined,
        includeBot ? botMetrics.processedFlaws : undefined,
        quality?.avg_data_quality,
        quality?.avg_confidence,
        quality?.avg_suggestion_deviation,
      ],
      source,
      feature,
    };
  };
  const weeklyRows = groups.filter(group => group.week).map((group) => {
    const values = reportValues(group);
    return [
      values.source,
      values.feature,
      group.week,
      scope.component || 'All',
      scope.feature,
      scope.versions.length ? scope.versions.map(kpiVersionLabel).join('; ') : 'All',
      scope.fromDate ? `${scope.fromDate}T00:00:00.000Z` : '',
      scope.toDate ? `${scope.toDate}T23:59:59.999Z` : '',
      ...values.metrics,
    ];
  });
  const metricNames = header.slice(8, -2);
  const totals = groups.filter(group => !group.week).flatMap((group) => {
    const values = reportValues(group);
    return values.metrics.flatMap((amount, index) => amount == null
      ? []
      : [[`${values.source} / ${values.feature} / ${metricNames[index]}`, amount]]);
  });
  const rows = Array.from({ length: Math.max(weeklyRows.length, totals.length) }, (_, index) => [
    ...(weeklyRows[index] ?? Array.from({ length: header.length - 2 }, () => '')),
    ...(totals[index] ?? ['', '']),
  ]);
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
