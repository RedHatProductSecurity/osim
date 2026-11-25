import { computed, onUnmounted, ref, watch } from 'vue';

import { DateTime } from 'luxon';

import type {
  AegisBotKpiCacheStatus, AegisBotKpiMetrics, AegisKpiMetrics, AegisKpiQuery,
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

// A 404 marks an Aegis server that predates the cache-status endpoint; the
// indicator is then simply absent instead of reported as a failure.
function isCacheStatusUnsupported(reason: unknown): boolean {
  return httpStatusOf(reason) === 404;
}

// A 404 marks an Aegis server that predates the cache-refresh endpoint;
// draining is then skipped and pages serve whatever the server provides.
function isCacheRefreshUnsupported(reason: unknown): boolean {
  return httpStatusOf(reason) === 404;
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
  const botProgress = ref<{ delivered: null | number; pages: number; selected: null | number }>(
    { pages: 0, delivered: 0, selected: null },
  );
  const botLoading = ref(false);
  const feedbackLoading = ref(false);
  const botComplete = ref(false);
  // Cache refresh counts observed while draining, for the refresh status.
  const botRefresh = ref<{ remaining: null | number; total: null | number }>({
    remaining: null,
    total: null,
  });
  const botCacheStatus = ref<AegisBotKpiCacheStatus | null>(null);
  const cacheStatusError = ref<null | string>(null);
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
    botProgress.value = { pages: 0, delivered: 0, selected: null };
    botPages = 0;
    lastBotSnapshot = undefined;
    botComplete.value = false;
    botRefresh.value = { remaining: null, total: null };
    botCacheStatus.value = null;
    cacheStatusError.value = null;
    errors.value = [];
    loadedSources.value = [];
    botLoading.value = !invalidRange.value;
    feedbackLoading.value = !invalidRange.value;
  }

  function publishBot(metrics: AegisBotKpiMetrics, id: number) {
    if (id !== requestId) return;
    if (metrics !== lastBotSnapshot) {
      lastBotSnapshot = metrics;
      botPages++;
    }
    bot.value = metrics;
    botProgress.value = {
      pages: botPages,
      delivered: metrics.progress?.delivered_flaws ?? null,
      selected: metrics.progress?.selected_flaws ?? null,
    };
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

  // Best-effort auxiliary load: cache status never gates `loading` or CSV
  // export, so its failure is reported through its own error instead of the
  // metric-source `errors` array.
  async function loadCacheStatus(id: number, component: string | undefined, signal: AbortSignal) {
    try {
      const status = await service.getBotKpiCacheStatus(component, signal);
      if (id === requestId) botCacheStatus.value = status;
    } catch (reason) {
      if (id === requestId && !isCacheStatusUnsupported(reason)) {
        cacheStatusError.value = kpiErrorMessage('The osidb-bot KPI cache', reason, 'status');
      }
    }
  }

  // Drain the cache-refresh endpoint until the selection is fully fresh.
  // Pages never refresh, so the metrics are only current once this finishes;
  // each call advances a server-side bounded slice, so the poll rate bounds
  // the OSIDB load. The 10000-call cap is a safety bound: draining the
  // largest selections takes hundreds of calls, never thousands.
  async function drainBotCache(id: number, component: string | undefined, signal: AbortSignal) {
    for (let call = 0; call < 10_000; call++) {
      signal.throwIfAborted();
      if (id !== requestId) return;
      let counts;
      try {
        counts = await service.refreshBotKpiCache(component, signal);
      } catch (reason) {
        if (isCacheRefreshUnsupported(reason)) {
          // Clear any counts an earlier poll published so the status line
          // does not claim a refresh is in progress after it was skipped.
          if (id === requestId) botRefresh.value = { remaining: null, total: null };
          return;
        }
        throw reason;
      }
      if (id !== requestId) return;
      botRefresh.value = {
        remaining: counts.stale_count,
        total: counts.total_flaws_selected,
      };
      if (counts.stale_count === 0) return;
    }
    throw new Error('osidb-bot KPI cache refresh did not drain.');
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
        // Bring the cache up to date first: pages are pure cache reads, so
        // without the drain they would serve last-known data.
        await drainBotCache(id, currentQuery.component, signal);
        if (id !== requestId) return;
        const metrics = await service.getBotKpiMetrics(currentQuery, {
          signal, onSnapshot: value => publishBot(value, id),
        });
        if (id !== requestId) return;
        publishBot(metrics, id);
        botComplete.value = true;
      }),
      // Only the component filter maps to the cache-status selection; the
      // recorded_* windows scope suggestions, not flaw freshness.
      loadCacheStatus(id, currentQuery.component, signal),
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
    botCacheStatus,
    cacheStatusError,
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
