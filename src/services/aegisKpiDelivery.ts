import type { AegisBotKpiMetrics, AegisBotKpiPage } from '@/types/aegisAI';

export function continuation(page: AegisBotKpiPage): null | string {
  const token = page.last_cve;
  if (token != null && (typeof token !== 'string' || !token)) {
    throw new Error('KPI pagination continuation is invalid. Select Refresh.');
  }
  return token ?? null;
}

function cumulativeSnapshot(page: AegisBotKpiPage, previous?: AegisBotKpiMetrics): AegisBotKpiMetrics {
  const authoritative = !continuation(page);
  return {
    ...(!authoritative ? { aggregates_available: false } : {}),
    available_components: page.available_components ?? undefined,
    entries: [...(previous?.entries ?? []), ...page.entries!],
    features: authoritative ? page.features : {},
    progress: page.progress,
    total_flaws_processed: authoritative ? page.total_flaws_processed : 0,
  };
}

export function createKpiDelivery() {
  let snapshot: AegisBotKpiMetrics | undefined;
  function accept(page: AegisBotKpiPage): AegisBotKpiMetrics {
    if (!Array.isArray(page?.entries)) {
      throw new TypeError('The Aegis server does not support detailed bot KPI reports yet.');
    }
    snapshot = cumulativeSnapshot(page, snapshot);
    return snapshot;
  }
  return { accept };
}
