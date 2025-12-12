<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';

import { DateTime } from 'luxon';
import { VueUiXy } from 'vue-data-ui/vue-ui-xy';

import type { AegisKpiMetrics, AegisKpiMetricsFeature } from '@/types/aegisAI';
import { AegisAIService } from '@/services/AegisAIService';
import { uniques } from '@/utils/helpers';

const FeatureLabels = {
  'suggest-cwe': 'Suggest CWE',
  'suggest-description': 'Suggest Description',
  'suggest-impact': 'Suggest Impact',
  'suggest-statement': 'Suggest Statement Mitigation',
};

type FeatureLabel = keyof typeof FeatureLabels;

const FeatureLabelsWithAll = {
  all: 'All',
  ...FeatureLabels,
};

type FeatureLabelsWithAllType = keyof typeof FeatureLabelsWithAll;

const kpiMetrics = ref<AegisKpiMetrics | null>(null);
// const chosenFeature = ref<keyof typeof FeatureLabels>('all');
const chosenFeature = ref<FeatureLabelsWithAllType>('all');

async function fetchKpiMetrics(feature: FeatureLabelsWithAllType = 'all') {
  const featureKey = feature === 'all' ? 'all' : (feature as any);
  try {
    const metrics = await new AegisAIService().getKpiMetrics(featureKey);
    const allowedFeatures = ['suggest-cwe', 'suggest-description', 'suggest-impact', 'suggest-statement'];
    kpiMetrics.value = Object.fromEntries(
      Object.entries(metrics).filter(([key]) => allowedFeatures.includes(key)),
    ) as AegisKpiMetrics;
  } catch (error) {
    console.error('KpiMetrics::fetchKpiMetrics() Error:', error);
    kpiMetrics.value = null;
  }
}

const dataByWeek = computed(() => kpiDataByWeek(kpiMetrics.value ?? {} as AegisKpiMetrics));

function kpiDataByWeek(kpiMetrics: AegisKpiMetrics) {
  return Object.fromEntries(
    Object.entries(kpiMetrics).map(([key, value]) => [key, collateEntriesByWeek(value)],
    ),
  );
}

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

const dateRange = computed(() => uniques(
  Object.values(dataByWeek.value ?? {}).flatMap(value => Object.keys(value)),
));

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
  name: 'Acceptance Percentage for ' + FeatureLabels[key as FeatureLabel],
  series: Object.values(value).map(({ percentage }) => percentage),
  suffix: '%',
  type: 'line',
  datalabels: false,
}),
));

// const chartRef = ref<InstanceType<typeof VueUiXy> | null>(null);

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
</script>

<template>
  <main class="mt-3">
    <h1>KPI Metrics</h1>
    <div class="kpi-controls">
      <label for="feature-select">Feature:</label>
      <select id="feature-select" v-model="chosenFeature" @change="handleFeatureChange">
        <option v-for="(label, key) in FeatureLabelsWithAll" :key="key" :value="key">
          {{ label }}
        </option>
      </select>
    </div>
    <div v-if="kpiMetrics !== null" class="kpi-chart-container">
      <VueUiXy
        :dataset="dataset"
        :config="config"
      />

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
  max-width: 800px;
}
</style>
