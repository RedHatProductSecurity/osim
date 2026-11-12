import type { AegisBotKpiDelivery, AegisBotKpiMetrics, AegisBotKpiPage } from '@/types/aegisAI';

export function continuation(page: AegisBotKpiPage): null | string {
  const token = page.delivery && 'continue_token' in page.delivery
    ? page.delivery.continue_token
    : page.next_cursor;
  if (token != null && (typeof token !== 'string' || !token)) {
    throw new Error('KPI delivery continuation is invalid. Select Refresh.');
  }
  return token ?? null;
}

function validateDelivery(delivery: AegisBotKpiDelivery, previous?: AegisBotKpiDelivery) {
  const { complete, page_id: pageId, received_flaws: received, run_id: runId, selected_flaws: selected } = delivery;
  const validCounts = Number.isInteger(received) && Number.isInteger(selected)
    && received >= 0 && received <= selected;
  const selectionPending = delivery.selection_complete === false;
  const selectionChanged = previous && previous.selection_complete !== false
    && (selectionPending || selected !== previous.selected_flaws);
  if (typeof runId !== 'string' || !runId || typeof pageId !== 'string' || !pageId
    || !validCounts || typeof complete !== 'boolean'
    || (selectionPending && (received !== 0 || selected !== 0 || complete))
    || (delivery.deferred && complete)
    || (complete && received !== selected)
    || (previous && (runId !== previous.run_id || selectionChanged
    || received < previous.received_flaws))) {
    throw new Error('KPI delivery run is inconsistent. Select Refresh to start a new run.');
  }
}

function isReplay(
  page: AegisBotKpiPage, previous: AegisBotKpiMetrics | undefined, pages: Map<string, AegisBotKpiDelivery>,
): boolean {
  const delivery = page.delivery;
  if (previous?.delivery && !delivery) throw new Error('KPI delivery metadata disappeared. Select Refresh.');
  if (!delivery) return false;
  if (previous && !previous.delivery) throw new Error('KPI delivery mode changed. Select Refresh.');
  const replay = delivery.deferred ? undefined : pages.get(delivery.page_id);
  validateDelivery(delivery, replay ?? previous?.delivery);
  if (delivery.complete === !!continuation(page)) {
    throw new Error('KPI delivery continuation is inconsistent. Select Refresh.');
  }
  if (replay && (replay.received_flaws !== delivery.received_flaws || replay.complete !== delivery.complete
    || (replay.selection_complete !== false) !== (delivery.selection_complete !== false)
    || !!replay.deferred !== !!delivery.deferred
    || replay.continue_token !== delivery.continue_token)) {
    throw new Error('KPI page replay changed. Select Refresh.');
  }
  if (!delivery.deferred) pages.set(delivery.page_id, delivery);
  return !!replay;
}

function cumulativeSnapshot(page: AegisBotKpiPage, previous?: AegisBotKpiMetrics): AegisBotKpiMetrics {
  const authoritative = !!page.delivery || !continuation(page);
  return {
    ...(!authoritative ? { aggregates_available: false } : {}),
    available_components: page.available_components ?? undefined,
    ...(page.delivery ? { delivery: page.delivery } : {}),
    entries: [...(previous?.entries ?? []), ...page.entries!],
    features: authoritative ? page.features : {},
    total_flaws_processed: authoritative ? page.total_flaws_processed : 0,
  };
}

export function createKpiDelivery() {
  let snapshot: AegisBotKpiMetrics | undefined;
  const pages = new Map<string, AegisBotKpiDelivery>();
  function accept(page: AegisBotKpiPage): AegisBotKpiMetrics | undefined {
    if (!Array.isArray(page?.entries)) {
      throw new TypeError('The Aegis server does not support detailed bot KPI reports yet.');
    }
    if ((page.delivery?.deferred || page.delivery?.selection_complete === false) && page.entries.length) {
      throw new Error('Deferred KPI pages cannot contain delivered entries. Select Refresh.');
    }
    if (isReplay(page, snapshot, pages)) return undefined;
    snapshot = cumulativeSnapshot(page, snapshot);
    return snapshot;
  }
  return { accept };
}
