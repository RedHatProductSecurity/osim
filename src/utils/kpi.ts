import { DateTime } from 'luxon';

import type { AegisBotKpiEntry, AegisKpiMetrics } from '@/types/aegisAI';

export const KpiFeatureLabels: Record<string, string> = {
  'all': 'All',
  'suggest-cwe': 'Suggest CWE',
  'suggest-description': 'Suggest Description',
  'suggest-title': 'Suggest Title',
  'suggest-cvss': 'Suggest CVSS',
  'suggest-impact': 'Suggest Impact',
  'suggest-mitigation': 'Suggest Mitigation',
  'suggest-statement': 'Suggest Statement',
  'suggest-affected-components': 'Suggest Affected Components',
};

const featureAliases: Record<string, string> = {
  components: 'suggest-affected-components',
  source_component: 'suggest-affected-components',
  cve_description: 'suggest-description',
  title: 'suggest-title',
  impact: 'suggest-impact',
  cwe_id: 'suggest-cwe',
  cvss3_vector: 'suggest-cvss',
};

export const canonicalKpiFeature = (feature: string) => featureAliases[feature] ?? feature;
export const kpiFeatureLabel = (feature: string) => KpiFeatureLabels[feature] ?? feature;
export const kpiVersionLabel = (version: string) => version || 'Unknown version';

export type KpiObservation = {
  accepted: boolean | null;
  cveId?: string;
  datetime: null | string;
  feature: string;
  outcome: 'feedback' | 'skipped' | 'suggested';
  source: 'feedback' | 'manual' | 'osidb-bot' | 'programmatic';
  version: string;
};

export function feedbackObservations(metrics: AegisKpiMetrics): KpiObservation[] {
  return Object.entries(metrics).flatMap(([feature, value]) => value.entries.map(entry => ({
    feature: canonicalKpiFeature(feature),
    accepted: entry.accepted,
    cveId: entry.cve_id,
    datetime: entry.datetime,
    version: entry.aegis_version,
    source: entry.feedback_source ?? 'feedback',
    outcome: 'feedback' as const,
  })));
}

export function botObservations(entries: AegisBotKpiEntry[]): KpiObservation[] {
  // The endpoint returns chronological records per CVE/field. Like its aggregate,
  // count each field once per outcome, comparing only its latest suggestion.
  const latest = new Map<string, KpiObservation>();
  for (const entry of entries) {
    if (!['AI-Bot', 'AI-Bot-Skipped'].includes(entry.type)) continue;
    const outcome = entry.type === 'AI-Bot' ? 'suggested' : 'skipped';
    const feature = canonicalKpiFeature(entry.feature);
    latest.set(JSON.stringify([entry.cve_id, feature, outcome]), {
      feature,
      cveId: entry.cve_id,
      datetime: entry.datetime,
      version: entry.aegis_version,
      source: 'osidb-bot',
      outcome,
      accepted: outcome === 'skipped' || entry.deviation === null ? null : entry.deviation === 0,
    });
  }
  return [...latest.values()];
}

export function summarizeKpi(observations: KpiObservation[]) {
  const scored = observations.filter(entry => entry.accepted !== null);
  const accepted = scored.filter(entry => entry.accepted).length;
  return {
    accepted,
    total: scored.length,
    percentage: scored.length ? accepted / scored.length * 100 : null,
    suggested: observations.filter(entry => entry.outcome === 'suggested').length,
    skipped: observations.filter(entry => entry.outcome === 'skipped').length,
    processedFlaws: new Set(observations.filter(entry => entry.source === 'osidb-bot').map(entry => entry.cveId)).size,
  };
}

export function parseKpiDate(datetime: null | string) {
  return DateTime.fromISO((datetime ?? '').replace(' ', 'T'), { zone: 'utc' });
}

export function kpiWeek(datetime: null | string): null | string {
  return parseKpiDate(datetime).startOf('week').toISODate();
}

export function kpiHistory(observations: KpiObservation[]) {
  const weekSet = new Set<string>();
  const counts = new Map<string, Map<string, { accepted: number; total: number }>>();
  for (const entry of observations) {
    const week = kpiWeek(entry.datetime);
    if (!week) continue;
    weekSet.add(week);
    if (!counts.has(entry.feature)) counts.set(entry.feature, new Map());
    const featureCounts = counts.get(entry.feature)!;
    const bucket = featureCounts.get(week) ?? { accepted: 0, total: 0 };
    if (entry.accepted !== null) {
      bucket.total++;
      bucket.accepted += Number(entry.accepted);
    }
    featureCounts.set(week, bucket);
  }
  const weeks = [...weekSet];
  const features = [...new Set(observations.map(entry => entry.feature))];
  const dataset = features.map((feature) => {
    const buckets = weeks.map(week => counts.get(feature)?.get(week) ?? { accepted: 0, total: 0 });
    return {
      name: kpiFeatureLabel(feature),
      series: buckets.map(bucket => bucket.total ? bucket.accepted / bucket.total * 100 : null),
      comments: buckets.map(bucket => `${bucket.accepted} of ${bucket.total} scored suggestions accepted/kept`),
      suffix: '%',
      type: 'line' as const,
      datalabels: false,
      smooth: false,
    };
  });
  return { weeks, dataset };
}
