import { computed, onUnmounted, ref, watch } from 'vue';

import { DateTime } from 'luxon';

import type {
  AegisBotKpiMetrics, AegisKpiMetrics, AegisKpiQuery,
} from '@/types/aegisAI';
import { AegisAIService } from '@/services/AegisAIService';
import {
  botObservations, canonicalKpiFeature, compareKpiVersions,
  feedbackObservations, KpiFeatureLabels,
} from '@/utils/kpi';

function httpStatusOf(reason: unknown): number | undefined {
  const error = reason && typeof reason === 'object' ? reason : {};
  const response = 'response' in error && error.response && typeof error.response === 'object'
    ? error.response
    : {};
  return 'status' in response && typeof response.status === 'number' ? response.status : undefined;
}

function kpiErrorMessage(source: string, reason: unknown, what = 'metrics'): string {
  const error = reason && typeof reason === 'object' ? reason : {};
  const status = httpStatusOf(reason);
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'errorMsg' in error && typeof error.errorMsg === 'string' ? error.errorMsg : '';
  let guidance = 'Select Refresh to try again.';
  if (status === 401 || message === 'Unable to refresh access token') {
    guidance = 'Authentication failed or your session expired. Sign in again, then refresh the metrics.';
  } else if (status === 403) {
    guidance = 'You do not have permission to load these metrics. Contact support if access is expected.';
  } else if ('isNetworkError' in error && error.isNetworkError) {
    guidance = 'Check your network connection, then select Refresh to try again.';
  } else if (status === 429) {
    guidance = 'Too many requests. Wait a moment, then select Refresh to try again.';
  } else if (status === 409 || status === 410) {
    guidance = 'This report run expired or was invalidated. Select Refresh to start a new run.';
  } else if (message.includes('does not support detailed bot KPI reports')) {
    guidance = 'The Aegis server must be upgraded to support detailed bot KPI reports.';
  }
  const statusDetail = status && !message.includes(`HTTP ${status}`) ? `HTTP ${status}` : '';
  const detail = [statusDetail, message].filter(Boolean).join(': ');
  return `${source} ${what} could not be loaded.${detail ? ` ${detail}` : ''} ${guidance}`;
}

export function useKpiDashboard() {
  const feature = ref('all');
  const component = ref('');
  const versions = ref<string[]>([]);
  const fromDate = ref('');
  const toDate = ref('');
  const feedback = ref<AegisKpiMetrics>({});
  const bot = ref<AegisBotKpiMetrics | null>(null);
  const botProgress = ref<{
    delivered: null | number; etaMs: null | number; pages: number; selected: null | number;
  }>({ delivered: 0, etaMs: null, pages: 0, selected: null });
  const botLoading = ref(false);
  const feedbackLoading = ref(false);
  const botComplete = ref(false);
  // Cache refresh counts observed in the pages' progress blocks: each page
  // refreshes its own slice, so refreshed_flaws grows page by page.
  const botRefresh = ref<{ etaMs: null | number; remaining: null | number; total: null | number }>({
    etaMs: null,
    remaining: null,
    total: null,
  });
  const loading = computed(() => botLoading.value || feedbackLoading.value);
  const botIncomplete = computed(() => !!bot.value && !botComplete.value);
  const errors = ref<string[]>([]);
  const loadedSources = ref<string[]>([]);
  const availableVersions = ref<string[]>([]);
  const availableComponents = ref<string[]>(['kernel']);
  const availableFeatures = ref(Object.keys(KpiFeatureLabels));
  const service = new AegisAIService();
  let requestId = 0;
  let controller: AbortController | undefined;
  // Pages received in the current bot run: every accepted page publishes a
  // fresh cumulative snapshot and the resolved run re-publishes the final
  // snapshot object, so object identity separates new pages from re-publishes.
  let botPages = 0;
  let lastBotSnapshot: AegisBotKpiMetrics | undefined;
  // Cadence anchors for the remaining-time estimates: the first page
  // baseline both phases' observed rates from its own counts.
  let pageFirstAt = 0;
  let pageFirstDelivered = 0;
  let refreshFirstAt = 0;
  let refreshFirstRemaining = 0;
  onUnmounted(() => {
    requestId++;
    controller?.abort();
  });

  const invalidRange = computed(() => !!(fromDate.value && toDate.value && fromDate.value > toDate.value));
  const query = computed<AegisKpiQuery>(() => ({
    detail: true,
    component: component.value.trim() || undefined,
    aegis_version: versions.value.length ? versions.value : undefined,
    recorded_after: fromDate.value
      ? DateTime.fromISO(fromDate.value, { zone: 'utc' }).startOf('day').toISO()!
      : undefined,
    recorded_before: toDate.value ? DateTime.fromISO(toDate.value, { zone: 'utc' }).endOf('day').toISO()! : undefined,
  }));

  function collectOptions() {
    const feedbackMetrics = Object.values(feedback.value);
    availableVersions.value = [...new Set([
      ...availableVersions.value,
      ...feedbackMetrics.flatMap(value => value.available_versions ?? value.entries.map(entry => entry.aegis_version)),
      ...(bot.value?.entries.map(entry => entry.aegis_version) ?? []),
    ])].sort(compareKpiVersions);
    availableComponents.value = [...new Set([
      ...availableComponents.value,
      ...(bot.value?.available_components ?? []),
      ...feedbackMetrics.flatMap(value => value.entries.flatMap(entry => entry.components?.suggested_components ?? [])),
    ])].sort();
    availableFeatures.value = [...new Set([
      ...availableFeatures.value,
      ...Object.keys(feedback.value).map(canonicalKpiFeature),
      ...Object.keys(bot.value?.features ?? {}).map(canonicalKpiFeature),
    ])];
  }

  function resetResults() {
    feedback.value = {};
    bot.value = null;
    botProgress.value = { delivered: 0, etaMs: null, pages: 0, selected: null };
    botPages = 0;
    lastBotSnapshot = undefined;
    botComplete.value = false;
    botRefresh.value = { etaMs: null, remaining: null, total: null };
    pageFirstAt = 0;
    pageFirstDelivered = 0;
    refreshFirstAt = 0;
    refreshFirstRemaining = 0;
    errors.value = [];
    loadedSources.value = [];
    botLoading.value = !invalidRange.value;
    feedbackLoading.value = !invalidRange.value;
  }

  function publishBot(metrics: AegisBotKpiMetrics, id: number) {
    if (id !== requestId) return;
    const now = Date.now();
    if (metrics !== lastBotSnapshot) {
      lastBotSnapshot = metrics;
      botPages++;
      if (!pageFirstAt) {
        pageFirstAt = now;
        pageFirstDelivered = metrics.progress?.delivered_flaws ?? 0;
      }
    }
    bot.value = metrics;
    const delivered = metrics.progress?.delivered_flaws ?? null;
    const selected = metrics.progress?.selected_flaws ?? null;
    const deliveredDelta = delivered === null ? 0 : delivered - pageFirstDelivered;
    const etaMs = delivered !== null && selected !== null && selected > delivered
      && deliveredDelta > 0 && now > pageFirstAt
      ? Math.round(((selected - delivered) / deliveredDelta) * (now - pageFirstAt))
      : null;
    botProgress.value = {
      delivered,
      etaMs,
      pages: botPages,
      selected,
    };
    // Each page refreshes its own slice, so the pages' refreshed_flaws is
    // the live refresh progress over the whole selection.
    const refreshed = metrics.progress?.refreshed_flaws ?? null;
    if (refreshed !== null && selected !== null) {
      const remaining = Math.max(0, selected - refreshed);
      if (!refreshFirstAt && remaining > 0) {
        refreshFirstAt = now;
        refreshFirstRemaining = remaining;
      }
      const refreshedDelta = refreshFirstRemaining - remaining;
      const refreshEta = remaining > 0 && refreshedDelta > 0 && now > refreshFirstAt
        ? Math.round((remaining / refreshedDelta) * (now - refreshFirstAt))
        : null;
      botRefresh.value = { etaMs: refreshEta, remaining, total: selected };
    }
    if (!loadedSources.value.includes('osidb-bot')) loadedSources.value.push('osidb-bot');
    collectOptions();
  }

  async function loadSource(source: string, id: number, load: () => Promise<void>) {
    try {
      await load();
    } catch (reason) {
      if (id === requestId) errors.value.push(kpiErrorMessage(source, reason));
    } finally {
      if (id === requestId) {
        if (source === 'Feedback') feedbackLoading.value = false;
        else botLoading.value = false;
      }
    }
  }

  async function refresh() {
    const id = ++requestId;
    controller?.abort();
    resetResults();
    if (invalidRange.value) return;
    controller = new AbortController();
    const signal = controller.signal;
    // An open-ended window is closed at the request moment so flaws updated
    // later cannot join the selection and invalidate the paginated run.
    const currentQuery: AegisKpiQuery = {
      ...query.value,
      recorded_before: query.value.recorded_before ?? DateTime.utc().toISO()!,
    };
    await Promise.all([
      loadSource('Feedback', id, async () => {
        const metrics = await service.getKpiMetrics('all', currentQuery, signal);
        if (id !== requestId) return;
        feedback.value = metrics;
        loadedSources.value.push('Feedback');
        collectOptions();
      }),
      loadSource('osidb-bot', id, async () => {
        // Each page refreshes its own slice of stale flaws server-side, so
        // pagination alone brings the cache and the metrics up to date.
        const metrics = await service.getBotKpiMetrics(currentQuery, {
          signal, onSnapshot: value => publishBot(value, id),
        });
        if (id !== requestId) return;
        publishBot(metrics, id);
        botComplete.value = true;
      }),
    ]);
  }

  watch(query, refresh, { immediate: true });
  const observations = computed(() => [
    ...feedbackObservations(feedback.value),
    ...botObservations(bot.value?.entries ?? []),
  ].filter(entry => feature.value === 'all' || entry.feature === feature.value));

  function toggleVersion(version: string) {
    versions.value = versions.value.includes(version)
      ? versions.value.filter(value => value !== version)
      : [...versions.value, version];
  }

  function clearFilters() {
    feature.value = 'all';
    component.value = '';
    versions.value = [];
    fromDate.value = '';
    toDate.value = '';
  }

  return {
    feature,
    component,
    versions,
    fromDate,
    toDate,
    feedback,
    bot,
    botProgress,
    botLoading,
    botRefresh,
    feedbackLoading,
    botIncomplete,
    loading,
    errors,
    loadedSources,
    invalidRange,
    availableVersions,
    availableComponents,
    availableFeatures,
    observations,
    refresh,
    toggleVersion,
    clearFilters,
  };
}
