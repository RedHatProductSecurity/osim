import { computed, onUnmounted, ref, watch } from 'vue';

import { DateTime } from 'luxon';

import type { AegisBotKpiMetrics, AegisKpiMetrics, AegisKpiQuery } from '@/types/aegisAI';
import { AegisAIService } from '@/services/AegisAIService';
import {
  botObservations, canonicalKpiFeature, compareKpiVersions, completeKpiWeeks,
  feedbackObservations, KpiFeatureLabels, kpiWeek,
} from '@/utils/kpi';

function kpiErrorMessage(source: string, reason: unknown): string {
  const error = reason && typeof reason === 'object' ? reason : {};
  const response = 'response' in error && error.response && typeof error.response === 'object'
    ? error.response
    : {};
  const status = 'status' in response && typeof response.status === 'number' ? response.status : undefined;
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
  } else if (message.includes('does not support detailed bot KPI reports')) {
    guidance = 'The Aegis server must be upgraded to support detailed bot KPI reports.';
  }
  const statusDetail = status && !message.includes(`HTTP ${status}`) ? `HTTP ${status}` : '';
  const detail = [statusDetail, message].filter(Boolean).join(': ');
  return `${source} metrics could not be loaded.${detail ? ` ${detail}` : ''} ${guidance}`;
}

export function useKpiDashboard() {
  const feature = ref('all');
  const component = ref('');
  const versions = ref<string[]>([]);
  const fromDate = ref('');
  const toDate = ref('');
  const feedback = ref<AegisKpiMetrics>({});
  const bot = ref<AegisBotKpiMetrics | null>(null);
  const loading = ref(false);
  const errors = ref<string[]>([]);
  const loadedSources = ref<string[]>([]);
  const availableVersions = ref<string[]>([]);
  const availableComponents = ref<string[]>(['kernel']);
  const availableFeatures = ref(Object.keys(KpiFeatureLabels));
  const availableWeeks = ref<string[]>([]);
  const service = new AegisAIService();
  let requestId = 0;
  onUnmounted(() => { requestId++; });

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
    // Retain loaded history so narrowing a window cannot move its range handles
    // or prevent expanding back to the original scope.
    availableWeeks.value = completeKpiWeeks([...new Set([
      ...availableWeeks.value,
      ...feedbackMetrics.flatMap(value => value.entries.map(entry => kpiWeek(entry.datetime))),
      ...(bot.value?.entries.map(entry => kpiWeek(entry.datetime)) ?? []),
    ].filter((week): week is string => week !== null))]);
  }

  async function refresh() {
    const id = ++requestId;
    feedback.value = {};
    bot.value = null;
    errors.value = [];
    loadedSources.value = [];
    loading.value = !invalidRange.value;
    if (invalidRange.value) return;
    const results = await Promise.allSettled([
      service.getKpiMetrics('all', query.value),
      service.getBotKpiMetrics(query.value),
    ]);
    if (id !== requestId) return;
    if (results[0].status === 'fulfilled') {
      feedback.value = results[0].value;
      loadedSources.value.push('Feedback');
    } else errors.value.push(kpiErrorMessage('Feedback', results[0].reason));
    if (results[1].status === 'fulfilled') {
      bot.value = results[1].value;
      loadedSources.value.push('osidb-bot');
    } else errors.value.push(kpiErrorMessage('osidb-bot', results[1].reason));
    collectOptions();
    loading.value = false;
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
    loading,
    errors,
    loadedSources,
    invalidRange,
    availableVersions,
    availableComponents,
    availableFeatures,
    availableWeeks,
    observations,
    refresh,
    toggleVersion,
    clearFilters,
  };
}
