<script setup lang="ts">
import { computed } from 'vue';

import { VueUiXy } from 'vue-data-ui/vue-ui-xy';

import { useKpiDashboard } from '@/composables/aegis/useKpiDashboard';

import {
  canonicalKpiFeature, kpiFeatureLabel, kpiHistory, kpiVersionLabel, parseKpiDate, summarizeKpi,
} from '@/utils/kpi';
import { createKpiCsv, downloadKpiCsv } from '@/utils/kpiReport';

const {
  availableComponents, availableFeatures, availableVersions, bot, component, errors, feature, fromDate,
  invalidRange, loading, observations, refresh, toDate, toggleVersion, versions,
} = useKpiDashboard();

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
        @click="downloadReport"
      >Download CSV</button>
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
    <p v-if="loading" role="status">Loading KPI metrics…</p>
    <div v-if="errors.length" role="alert" class="alert alert-warning">
      <p v-for="error in errors" :key="error">{{ error }}</p>
      <p>Results below include only the sources that loaded successfully.</p>
    </div>
    <div v-if="!loading && !invalidRange" class="kpi-chart-container">
      <p v-if="!observations.length">No KPI records match these filters.</p>
      <template v-else>
        <h2 class="h4">{{ errors.length ? 'Available-source' : 'Combined' }} Acceptance Rate</h2>
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
          <li v-for="metrics in perSource" :key="metrics.source">
            {{ metrics.source }}: {{ percentage(metrics.percentage) }} ({{ metrics.accepted }} / {{ metrics.total }})
          </li>
        </ul>
      </template>
      <section v-if="bot" aria-labelledby="bot-heading">
        <h2 id="bot-heading" class="h4">osidb-bot</h2>
        <p data-testid="processed-flaws">
          {{ processedFlaws }} processed flaws in the selected scope (DONE workflow state).
        </p>
        <p>Bot history compares suggestions with current flaw values, grouped by suggestion date.</p>
        <div class="table-responsive">
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
