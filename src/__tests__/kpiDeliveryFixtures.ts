import type {
  AegisBotFeatureKpi, AegisBotKpiEntry, AegisBotKpiPage, AegisBotKpiProgress,
} from '@/types/aegisAI';

export const botEntry = (cve: string, feature = 'impact'): AegisBotKpiEntry => ({
  cve_id: cve,
  feature,
  aegis_version: '0.9.2',
  datetime: '2026-09-01T00:00:00Z',
  type: 'AI-Bot',
  deviation: 0,
  data_quality: 0.8,
  confidence: 0.9,
});

export const botFeatures: Record<string, AegisBotFeatureKpi> = {
  impact: {
    suggested: 2,
    kept: 1,
    modified: 1,
    skipped: 0,
    acceptance_rate: 50,
    avg_confidence: 0.7,
    avg_data_quality: 0.6,
    avg_suggestion_deviation: 0.5,
  },
};

// One page of the cursor-paginated osidb-bot KPI protocol: `entries` covers
// only this page's slice of the selection, `nextCursor` continues the run
// (null ends it), and `progress` reports the cumulative cache-refresh counts.
// A fully cached selection is served as one page without cursor or progress.
export function botPage(
  entries: AegisBotKpiEntry[],
  nextCursor: null | string,
  progress?: AegisBotKpiProgress | null,
  overrides: Partial<AegisBotKpiPage> = {},
): AegisBotKpiPage {
  return {
    entries,
    features: {},
    next_cursor: nextCursor,
    progress: progress ?? undefined,
    total_flaws_processed: 0,
    ...overrides,
  };
}

export function deferred<T = void>() {
  let resolve!: (value: PromiseLike<T> | T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
