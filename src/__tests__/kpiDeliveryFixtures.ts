import type { AegisBotKpiEntry, AegisBotKpiPage } from '@/types/aegisAI';

export const deliveryEntry = (cve: string, feature = 'impact'): AegisBotKpiEntry => ({
  cve_id: cve,
  feature,
  aegis_version: '0.9.2',
  datetime: '2026-09-01T00:00:00Z',
  type: 'AI-Bot',
  deviation: 0,
  data_quality: 0.8,
  confidence: 0.9,
});

export const deliveryFeatures: AegisBotKpiPage['features'] = {
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

export function deliveryPage(
  pageId: string, received: number, selected: number, nextCursor: null | string,
  entries: AegisBotKpiEntry[] = [],
): AegisBotKpiPage {
  return {
    delivery: {
      run_id: 'stable-run',
      page_id: pageId,
      received_flaws: received,
      selected_flaws: selected,
      complete: nextCursor === null,
    },
    entries,
    features: {},
    total_flaws_processed: 0,
    next_cursor: nextCursor,
    progress: { complete: true, refreshed_flaws: selected, selected_flaws: selected },
  };
}

export function deferred<T = void>() {
  let resolve!: (value: PromiseLike<T> | T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
