<script setup lang="ts">
import { computed } from 'vue';

import { VueUiXy } from 'vue-data-ui/vue-ui-xy';

import { useKpiDashboard } from '@/composables/aegis/useKpiDashboard';

import { BOT_KPI_MAX_FLAWS_PER_PAGE } from '@/services/AegisAIService';
import {
  canonicalKpiFeature, kpiFeatureLabel, kpiHistory, kpiSourceDescription, kpiSourceLabel, kpiVersionLabel,
  parseKpiDate, summarizeKpi,
} from '@/utils/kpi';
import { createKpiCsv, downloadKpiCsv } from '@/utils/kpiReport';

const {
  availableComponents, availableFeatures, availableVersions,
  bot, botCacheStatus, botIncomplete, botLoading, botProgress,
  cacheStatusError, clearFilters, component, errors, feature, feedbackLoading, fromDate,
  invalidRange, loadedSources, loading, observations, refresh, toDate, toggleVersion, versions,
} = useKpiDashboard();

const allSourcesFailed = computed(() => !loading.value && errors.value.length > 0 && !loadedSources.value.length);
// The run's own progress.selected_flaws is authoritative once the first page
// reports it; until then the cache-status selection total is the same flaw
// population and serves as the progress total.
const botSelectedTotal = computed(() =>
  botProgress.value.selected ?? botCacheStatus.value?.total_flaws_selected ?? null);
const botCacheStatusText = computed(() => {
  const status = botCacheStatus.value;
  if (!status) return null;
  if (!status.total_flaws_selected) return 'No flaws match the current selection.';
  if (!status.stale_count) return `All ${status.total_flaws_selected} selected flaws are cached fresh.`;
  return `${status.stale_count} of ${status.total_flaws_selected} selected flaws are not cached fresh `
    + `(${status.uncached_count} uncached, ${status.outdated_count} changed in OSIDB).`;
});
const botProgressPercent = computed(() => {
  const { refreshed } = botProgress.value;
  const selected = botSelectedTotal.value;
  return selected !== null && refreshed !== null
    ? selected === 0 ? 100 : Math.min(100, Math.round((refreshed / selected) * 100))
    : null;
});
// Received pages and their projected total. Warm-cache pages serve up to
// 1000 flaws regardless of the requested limit, so the total projects from
// the observed delivery pace — distinct delivered CVEs per page — floored at
// the requested page size. Retries and short pages keep it approximate.
const botPageEstimate = computed(() => {
  const { pages } = botProgress.value;
  const total = botSelectedTotal.value;
  if (total === null || total <= 0 || pages <= 0) return null;
  const deliveredFlaws = new Set(bot.value?.entries.map(entry => entry.cve_id)).size;
  const pace = Math.max(BOT_KPI_MAX_FLAWS_PER_PAGE, Math.ceil(deliveredFlaws / pages));
  return { delivered: pages, estimated: Math.max(pages, Math.ceil(total / pace)) };
});
const history = computed(() => kpiHistory(observations.value));
const overall = computed(() => summarizeKpi(observations.value));
const perFeature = computed(() => [...new Set(observations.value.map(entry => entry.feature))].map(name => ({
  name, ...summarizeKpi(observations.value.filter(entry => entry.feature === name)),
})));
const perSource = computed(() => [...new Set(observations.value.map(entry => entry.source))].map(source => ({
  source, ...summarizeKpi(observations.value.filter(entry => entry.source === source)),
})));
const botFeatures = computed(() => Object.entries(bot.value?.features ?? {}).filter(
  ([name]) => feature.value === 'all' || canonicalKpiFeature(name) === feature.value,
));
const processedFlaws = computed(() => feature.value === 'all'
  ? bot.value?.total_flaws_processed ?? 0
  : overall.value.processedFlaws);
const undatedRecords = computed(() => observations.value.filter(entry => !parseKpiDate(entry.datetime).isValid).length);
const config = computed(() => ({
  chart: {
    tooltip: { showPercentage: false },
    zoom: { show: false },
    grid: { labels: { xAxisLabels: { values: history.value.weeks.map(week => `Week of ${week}`) } } },
  },
}));
const percentage = (value: null | number) => value === null ? 'N/A' : `${value.toFixed(1)}%`;
const quality = (value: null | number) => value === null ? 'N/A' : value.toFixed(2);

function downloadReport() {
  downloadKpiCsv(createKpiCsv(observations.value, {
    bot: bot.value,
    component: component.value,
    feature: feature.value,
    versions: versions.value,
    fromDate: fromDate.value,
    toDate: toDate.value,
  }));
}

function applyComponent(event: Event) {
  component.value = (event.target as HTMLInputElement).value.trim();
}
</script>

<template>
  <main class="mt-3">
    <h1>KPI Metrics</h1>
    <div class="kpi-controls d-flex flex-wrap gap-3 align-items-end mb-3">
      <div>
        <label for="kpi-component" class="form-label">Component:</label>
        <input
          id="kpi-component"
          v-model.lazy.trim="component"
          type="text"
          list="kpi-components"
          class="form-control"
          placeholder="All components"
          aria-describedby="component-help"
          @keydown.enter="applyComponent"
        />
        <datalist id="kpi-components">
          <option v-for="name in availableComponents" :key="name" :value="name" />
        </datalist>
        <small id="component-help">Press Enter or leave the field to apply.</small>
      </div>
      <div>
        <label for="feature-select" class="form-label">Feature:</label>
        <select id="feature-select" v-model="feature" class="form-select">
          <option v-for="name in availableFeatures" :key="name" :value="name">{{ kpiFeatureLabel(name) }}</option>
        </select>
      </div>
      <div>
        <label for="kpi-from" class="form-label">From (UTC):</label>
        <input
          id="kpi-from"
          v-model="fromDate"
          type="date"
          class="form-control"
        />
      </div>
      <div>
        <label for="kpi-to" class="form-label">Through (UTC):</label>
        <input
          id="kpi-to"
          v-model="toDate"
          type="date"
          class="form-control"
        />
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary"
        :disabled="loading"
        @click="refresh"
      >Refresh</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="loading || invalidRange || !!errors.length || (!observations.length && !botFeatures.length)"
        :title="errors.length ? 'Download unavailable until all KPI sources load successfully.' : undefined"
        @click="downloadReport"
      >Download CSV</button>
      <button type="button" class="btn btn-outline-secondary" @click="clearFilters">Clear All Filters</button>
    </div>
    <p v-if="component">Showing flaws affecting component: <strong>{{ component }}</strong></p>
    <section class="mb-3" aria-labelledby="version-heading">
      <h2 id="version-heading" class="h5">Filter By Version / Build</h2>
      <button
        v-for="version in availableVersions"
        :key="version"
        type="button"
        class="btn me-2 mb-2"
        :class="versions.includes(version) ? 'btn-secondary' : 'btn-outline-secondary'"
        :aria-pressed="versions.includes(version)"
        @click="toggleVersion(version)"
      >{{ kpiVersionLabel(version) }}</button>
      <button
        v-if="versions.length"
        type="button"
        class="btn btn-outline-secondary"
        @click="versions = []"
      >
        Clear Version Filters
      </button>
    </section>
    <p v-if="invalidRange" role="alert">The start date must be on or before the end date.</p>
    <p v-if="feedbackLoading" role="status">Loading feedback metrics…</p>
    <div v-if="botLoading" class="mb-3">
      <span role="status">
        Loading osidb-bot metrics…
        <template v-if="botProgress.refreshed !== null && botSelectedTotal !== null">
          {{ botProgress.refreshed }} / {{ botSelectedTotal }} flaws refreshed
        </template>
        <template v-else-if="botProgress.refreshed === 0">0 flaws refreshed; awaiting the first page…</template>
        <template v-else-if="botSelectedTotal !== null">
          Flaw refresh counts unavailable from this server ({{ botSelectedTotal }} flaws selected).
        </template>
        <template v-else>Flaw refresh counts unavailable from this server.</template>
        <template v-if="botPageEstimate">
          · page {{ botPageEstimate.delivered }} of ~{{ botPageEstimate.estimated }}
        </template>
        <template v-if="botCacheStatusText">{{ botCacheStatusText }}</template>
      </span>
      <div
        class="progress"
        role="progressbar"
        aria-label="osidb-bot KPI refresh progress"
        :aria-valuenow="botProgressPercent ?? undefined"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          v-if="botProgressPercent !== null"
          class="progress-bar progress-bar-striped progress-bar-animated"
          :style="{ width: `${botProgressPercent}%` }"
        >{{ botProgressPercent }}%</div>
        <div v-else class="progress-bar kpi-progress-indeterminate"></div>
      </div>
    </div>
    <p v-if="botIncomplete" role="status" class="alert alert-warning">
      Incomplete osidb-bot metrics:
      <template v-if="botProgress.refreshed !== null && botSelectedTotal !== null">
        {{ botProgress.refreshed }} / {{ botSelectedTotal }} selected flaws refreshed.
      </template>
      <template v-else>The server does not report how many selected flaws have been refreshed.</template>
      Charts and totals cover only received data.
      <template v-if="!botLoading && botCacheStatusText">
        Cache status when the run started: {{ botCacheStatusText }}
      </template>
      <template v-if="bot?.aggregates_available === false">
        Aggregate bot metrics are unavailable until loading completes.
      </template>
      <template v-if="!botLoading">Select Refresh to start a new run.</template>
    </p>
    <p v-if="cacheStatusError" role="alert" class="alert alert-warning">{{ cacheStatusError }}</p>
    <div v-if="errors.length" role="alert" class="alert alert-warning">
      <h2 class="h5">{{ allSourcesFailed ? 'KPI metrics unavailable' : 'Incomplete KPI results' }}</h2>
      <p v-if="allSourcesFailed">Neither feedback nor osidb-bot metrics loaded. No KPI totals are available.</p>
      <p v-else-if="loadedSources.length">
        Loaded sources: {{ loadedSources.join(', ') }}. Charts and totals include only these sources and are incomplete.
      </p>
      <p v-else>Other KPI sources are still loading.</p>
      <p v-for="error in errors" :key="error">{{ error }}</p>
      <p>CSV download is unavailable until all KPI sources load successfully.</p>
      <button
        type="button"
        class="btn btn-outline-secondary"
        :disabled="loading"
        @click="refresh"
      >
        Retry loading metrics
      </button>
    </div>
    <div v-if="loadedSources.length && !invalidRange && !allSourcesFailed" class="kpi-chart-container">
      <p v-if="!observations.length && loading">No KPI records received yet.</p>
      <p v-else-if="!observations.length && errors.length">
        No KPI records match these filters in the loaded source. Records from the failed source may be missing.
      </p>
      <p v-else-if="!observations.length">No KPI records match these filters.</p>
      <template v-else>
        <h2 class="h4">
          {{ loading || botIncomplete ? 'Partial' : errors.length ? 'Available-source' : 'Combined' }} Acceptance Rate
        </h2>
        <p data-testid="overall-rate">
          {{ percentage(overall.percentage) }} — {{ overall.accepted }} of {{ overall.total }}
          scored suggestions accepted/kept
        </p>
        <p>
          Acceptance combines feedback observations and bot field decisions; it is not a count of unique flaws.
          Skipped and unscored suggestions are excluded from the rate.
        </p>
        <VueUiXy v-if="history.weeks.length" :dataset="history.dataset" :config="config" />
        <p v-if="undatedRecords">{{ undatedRecords }} records without valid timestamps are included in totals only.</p>
        <h3 class="h5">Per Feature</h3>
        <ul>
          <li v-for="metrics in perFeature" :key="metrics.name">
            {{ kpiFeatureLabel(metrics.name) }}: {{ percentage(metrics.percentage) }}
            ({{ metrics.accepted }} / {{ metrics.total }})
          </li>
        </ul>
        <h3 class="h5">By Source</h3>
        <ul>
          <li
            v-for="metrics in perSource"
            :key="metrics.source"
            :title="kpiSourceDescription(metrics.source)"
          >
            {{ kpiSourceLabel(metrics.source) }}: {{ percentage(metrics.percentage) }}
            ({{ metrics.accepted }} / {{ metrics.total }})
          </li>
        </ul>
      </template>
      <section v-if="bot" aria-labelledby="bot-heading">
        <h2 id="bot-heading" class="h4">osidb-bot</h2>
        <p v-if="bot.aggregates_available !== false" data-testid="processed-flaws">
          {{ processedFlaws }} processed flaws in the
          {{ botIncomplete ? 'received portion of the selected scope' : 'selected scope' }} (DONE workflow state).
        </p>
        <p>Bot history compares suggestions with current flaw values, grouped by suggestion date.</p>
        <div v-if="bot.aggregates_available !== false" class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Feature</th><th>Suggested</th><th>Skipped</th><th>Kept</th><th>Modified</th>
                <th>Acceptance</th><th>Avg. quality</th><th>Avg. confidence</th><th>Avg. deviation</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[name, metrics] in botFeatures" :key="name">
                <th>{{ kpiFeatureLabel(canonicalKpiFeature(name)) }}</th>
                <td>{{ metrics.suggested }}</td><td>{{ metrics.skipped }}</td>
                <td>{{ metrics.kept }}</td><td>{{ metrics.modified }}</td>
                <td>{{ metrics.kept + metrics.modified ? percentage(metrics.acceptance_rate) : 'N/A' }}</td>
                <td>{{ quality(metrics.avg_data_quality) }}</td><td>{{ quality(metrics.avg_confidence) }}</td>
                <td>{{ quality(metrics.avg_suggestion_deviation) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.kpi-progress-indeterminate {
  position: relative;
  width: 30%;
  animation: kpi-progress-slide 1.5s ease-in-out infinite;
}

@keyframes kpi-progress-slide {
  from {
    left: -30%;
  }

  to {
    left: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kpi-progress-indeterminate {
    animation: none;
  }
}
</style>
