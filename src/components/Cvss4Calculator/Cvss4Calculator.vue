<script setup lang="ts">
import { useCvss4Selections, useCvss4Calculations } from '@/composables/useCvss4Calculator';

import { MetricNamesWithValues } from '@/utils/cvss40';

import { CVSS4MetricsForUI } from './cvss4-ui-contants';

const { error, score, vectorString } = useCvss4Calculations();

const { cvss4Selections } = useCvss4Selections();

function setMetric(category: string, metric: string, value: string) {
  cvss4Selections.value[category][metric] = value;
}
</script>

<template>
  <h2>CVSS4 Calculator</h2>
  <details>
    <summary>Score: {{ score ?? 'null' }} {{ vectorString }}</summary>
    <pre>
      {{ JSON.stringify(cvss4Selections, undefined, 2) }}
    </pre>
  </details>
  <p v-if="error">Errors: {{ error }}</p>
  <div v-for="(category, categoryName) in CVSS4MetricsForUI" :key="categoryName">
    {{ categoryName }}
    <div v-for="(metricGroup, groupName) in category.metric_groups" :key="groupName">
      - {{ groupName }}
      <div v-for="metric in metricGroup as Record<string, any>" :key="metric">
        {{ metric.short }}
        <button
          v-for="{tooltip, value}, metricName in metric.options"
          :key="metricName"
          :title="tooltip"
          :class="{ selected: cvss4Selections?.[MetricNamesWithValues?.[categoryName]]?.[metric.short] === value }"
          @click="setMetric(MetricNamesWithValues[categoryName], metric.short, value)"
        >
          {{ metricName }}</button>

        <div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.selected {
  background: green;
}
</style>
@/composables/useCvss4Calculator