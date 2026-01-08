<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';

import { DateTime } from 'luxon';
import { VueUiXy } from 'vue-data-ui/vue-ui-xy';

import type { AegisKpiFeatureParamType, AegisKpiMetrics, AegisKpiMetricsFeature } from '@/types/aegisAI';
import { AegisAIService } from '@/services/AegisAIService';
import { uniques } from '@/utils/helpers';

const FeatureLabels: Record<AegisKpiFeatureParamType, string> = {
  'all': 'All',
  'suggest-cwe': 'Suggest CWE',
  'suggest-description': 'Suggest Description',
  'suggest-title': 'Suggest Title',
  'suggest-cvss': 'Suggest CVSS',
  'suggest-impact': 'Suggest Impact',
  'suggest-statement': 'Suggest Statement Mitigation',
};

type FeatureLabel = keyof typeof FeatureLabels;

const kpiMetrics = ref<AegisKpiMetrics | null>(null);
const chosenFeature = ref<AegisKpiFeatureParamType>('all');

async function fetchKpiMetrics(feature: AegisKpiFeatureParamType = 'all') {
  const featureKey = feature === 'all' ? 'all' : feature;
  try {
    const metrics = await new AegisAIService().getKpiMetrics(featureKey);
    const allowedFeatures = [
      'suggest-cwe',
      'suggest-description',
      'suggest-impact',
      'suggest-statement',
      'suggest-title',
      'suggest-cvss',
    ];
    kpiMetrics.value = Object.fromEntries(
      Object.entries(metrics).filter(([key]) => allowedFeatures.includes(key)),
    ) as AegisKpiMetrics;
  } catch (error) {
    console.error('KpiMetrics::fetchKpiMetrics() Error:', error);
    kpiMetrics.value = null;
  }
}

const dataByWeek = computed(() => kpiDataByWeek(filteredKpiData.value));

function kpiDataByWeek(kpiMetrics: AegisKpiMetrics) {
  return Object.fromEntries(
    Object.entries(kpiMetrics).map(([feature, entries]) => [feature, collateEntriesByWeek(entries)],
    ),
  );
}

const filteredKpiData = computed(() => {
  const areNoneSelected = Object.values(versionSelections.value).every(value => !value);
  return areNoneSelected
    ? kpiMetrics.value ?? {} as AegisKpiMetrics
    : Object.fromEntries(Object.entries(
      kpiMetrics.value ?? {}).map(([feature, entries]) =>
      [
        feature,
        {
          ...entries,
          entries: entries.entries.filter(({ aegis_version }) => versionSelections.value[aegis_version]),
        },
      ],
    )) as AegisKpiMetrics;
});

function collateEntriesByWeek(kpiMetrics: AegisKpiMetricsFeature) {
  return kpiMetrics.entries.reduce((acc, { accepted, datetime }) => {
    const date = DateTime.fromFormat(datetime, 'yyyy-MM-dd HH:mm:ss.SSS');
    const weekInMonth = date.weekNumber - date.startOf('month').weekNumber + 1;
    const week = date.toFormat('MMM yy') + ' Week ' + weekInMonth;
    acc[week] = {
      accepted: (acc[week]?.accepted || 0) + Number(accepted),
      total: (acc[week]?.total || 0) + 1,
      percentage: ((acc[week]?.accepted || 0) + Number(accepted)) / ((acc[week]?.total || 0) + 1) * 100,
    };
    return acc;
  }, {} as Record<string, { accepted: number; percentage: number; total: number }>);
}

function parseDateFromString(datetime: string): DateTime {
  const [month, year, _, week] = datetime.split(' ');
  const monthDay = (Number(week) - 1) * 7 + 1;
  return DateTime.fromObject({
    year: Number(`20${year}`),
    month: DateTime.fromFormat(month, 'MMM').month,
    day: monthDay,
  });
}

const dateRange = computed(() => uniques(
  Object.values(dataByWeek.value ?? {}).flatMap(value => Object.keys(value)),
));

const aegisBuildVersions = computed(() => uniques(
  Object.values(kpiMetrics.value ?? {}).flatMap(value => value.entries.map(entry => entry.aegis_version)),
));

const versionSelections = ref<Record<string, boolean>>({});
watch(aegisBuildVersions, () => {
  aegisBuildVersions.value.forEach((version: string) => {
    versionSelections.value[version] = false;
  });
});

const filteredDateRangeTotals = computed(() => Object.entries(filteredKpiData.value)
  .reduce((filteredTotals, [feature, metrics]) => {
    const filteredEntries = metrics.entries.filter(({ datetime }) => {
      const startDateString = dateRange.value[rangeSliderIndexes.value.min];
      const endDateString = dateRange.value[rangeSliderIndexes.value.max];
      if (!startDateString || !endDateString) {
        return false;
      }
      const startDate = parseDateFromString(startDateString);
      const endDate = parseDateFromString(endDateString);
      const datetimeDate = DateTime.fromFormat(datetime, 'yyyy-MM-dd HH:mm:ss.SSS', { zone: 'utc' });
      return datetimeDate.toMillis() >= startDate.toMillis() && datetimeDate.toMillis() <= endDate.toMillis();
    });
    filteredTotals[feature] = filteredEntries.reduce(
      (total, { accepted }) => total + (accepted ? 1 : 0), 0,
    ) / filteredEntries.length * 100;
    return filteredTotals;
  }, {} as Record<string, number>));

const rangeSliderIndexes = ref(
  {
    min: 0,
    max: dateRange.value.length - 1,
  },
);

watch(dateRange, () => {
  if (!dateRange.value[rangeSliderIndexes.value.min]) {
    rangeSliderIndexes.value.min = 0;
  }
  if (!dateRange.value[rangeSliderIndexes.value.max]) {
    rangeSliderIndexes.value.max = dateRange.value.length - 1;
  }
});
const config = computed(() => ({
  chart: {
    tooltip: {
      showPercentage: false,
    },
    zoom: {
      startIndex: rangeSliderIndexes.value.min,
      endIndex: rangeSliderIndexes.value.max,
      minimap: { show: true },
    },
    grid: {
      labels: {
        xAxisLabels: {
          // color: '#CCCCCC',
          values: dateRange.value,
        },
        datetimeFormatter: {
          enable: true,
        },
      },
    },
  },
}));

const dataset = computed(() => Object.entries(dataByWeek.value ?? {}).map(([key, value]) => ({
  name: FeatureLabels[key as FeatureLabel],
  series: Object.values(value).map(({ percentage }) => percentage),
  suffix: '%',
  type: 'line',
  datalabels: false,
  smooth: true,
  comments: Object.values(value).map(({ accepted, total }) => `${accepted} of ${total} suggestions accepted`),
})));

function handleFeatureChange() {
  fetchKpiMetrics(chosenFeature.value as FeatureLabel);
}

onMounted(async () => {
  await fetchKpiMetrics(chosenFeature.value);
  document.querySelector('input.range-left')?.addEventListener('change', (event) => {
    rangeSliderIndexes.value.min = Number((event.target as HTMLInputElement).value);
  });
  document.querySelector('input.range-right')?.addEventListener('change', (event) => {
    rangeSliderIndexes.value.max = Number((event.target as HTMLInputElement).value);
  });
});

onUnmounted(() => {
  document.querySelector('input.range-left')?.removeEventListener('change', (event) => {
    rangeSliderIndexes.value.min = Number((event.target as HTMLInputElement).value);
  });
  document.querySelector('input.range-right')?.removeEventListener('change', (event) => {
    rangeSliderIndexes.value.max = Number((event.target as HTMLInputElement).value);
  });
});
const isFilteredDateRange = computed(
  () => rangeSliderIndexes.value.min !== 0 || rangeSliderIndexes.value.max !== dateRange.value.length - 1);
</script>

<template>
  <main class="mt-3">
    <h1>KPI Metrics</h1>
    <div class="kpi-controls">
      <label for="feature-select">Feature:</label>
      <select id="feature-select" v-model="chosenFeature" @change="handleFeatureChange">
        <option v-for="(label, key) in FeatureLabels" :key="key" :value="key">
          {{ label }}
        </option>
      </select>
    </div>
    <div v-if="kpiMetrics !== null" class="kpi-chart-container">
      <div class="row">
        <div class="col-8">
          <VueUiXy :dataset="dataset" :config="config" />
        </div>
        <div class="col-4">
          <section class="mb-3">
            <h3>Filter By Version</h3>
            <button
              v-for="aegisBuildVersion in aegisBuildVersions"
              :key="aegisBuildVersion"
              class="btn"
              :class="{
                'btn-outline-secondary': !versionSelections[aegisBuildVersion],
                'btn-secondary': versionSelections[aegisBuildVersion]
              }"
              type="button"
              @click="versionSelections[aegisBuildVersion] = !versionSelections[aegisBuildVersion]"
            >
              {{ aegisBuildVersion }}
            </button>
          </section>
          <h3>Mean Acceptance Rates</h3>
          <section v-if="!isFilteredDateRange">
            <p v-for="[feature, metrics] in Object.entries(kpiMetrics)" :key="feature">
              {{ metrics.acceptance_percentage }}% Acceptance Rate for {{ FeatureLabels[feature as FeatureLabel] }}</p>
          </section>
          <section v-if="isFilteredDateRange">
            <p v-for="[feature, acceptancePercentage] in Object.entries(filteredDateRangeTotals)" :key="feature">
              {{ acceptancePercentage.toFixed(1) }}% Acceptance Rate for {{ FeatureLabels[feature as FeatureLabel] }}
            </p>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.kpi-controls {
  margin-bottom: 1rem;

  label {
    margin-right: 0.5rem;
  }

  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
}

.kpi-chart-container {
  position: relative;
  max-width: 80%;
  max-height: 40vh;
}
</style>
