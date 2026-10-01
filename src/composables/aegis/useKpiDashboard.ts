import { computed, onUnmounted, ref, watch } from 'vue';

import { DateTime } from 'luxon';

import type { AegisBotKpiMetrics, AegisKpiMetrics, AegisKpiQuery } from '@/types/aegisAI';
import { AegisAIService } from '@/services/AegisAIService';
import { botObservations, canonicalKpiFeature, feedbackObservations, KpiFeatureLabels } from '@/utils/kpi';

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
  const availableVersions = ref<string[]>([]);
  const availableComponents = ref<string[]>(['kernel']);
  const availableFeatures = ref(Object.keys(KpiFeatureLabels));
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
    ])];
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

  async function refresh() {
    const id = ++requestId;
    feedback.value = {};
    bot.value = null;
    errors.value = [];
    loading.value = !invalidRange.value;
    if (invalidRange.value) return;
    const results = await Promise.allSettled([
      service.getKpiMetrics('all', query.value),
      service.getBotKpiMetrics(query.value),
    ]);
    if (id !== requestId) return;
    if (results[0].status === 'fulfilled') feedback.value = results[0].value;
    else errors.value.push('Feedback metrics could not be loaded.');
    if (results[1].status === 'fulfilled') bot.value = results[1].value;
    else errors.value.push(
      'osidb-bot metrics could not be loaded. The Aegis server must support detailed KPI reports.',
    );
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
    invalidRange,
    availableVersions,
    availableComponents,
    availableFeatures,
    observations,
    refresh,
    toggleVersion,
  };
}
