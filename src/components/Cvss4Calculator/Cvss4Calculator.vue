<script setup lang="ts">
import { useCvss4Selections } from '@/composables/useCvss4';

import { CVSS4MetricsForUI, MetricNamesWithValues } from '@/utils/cvss40';

const { cvss4Selections } = useCvss4Selections();
function setMetric(category: string, metric: string, value: string) {
  console.log(category, metric, value);
  cvss4Selections.value[category][metric] = value;
  console.log(cvss4Selections.value);
}
</script>

<template>
  <h2>aslkfdj</h2>
  {{ cvss4Selections }}
  <div v-for="(category, categoryName) in CVSS4MetricsForUI" :key="categoryName">
    {{ categoryName }}
    <div v-for="(metricGroup, groupName) in category.metric_groups" :key="metric">
      - {{ groupName }}
      <div v-for="metric in metricGroup" :key="metric">
        {{ metric.short }}
        <button
          v-for="{tooltip, value}, metricName in metric.options"
          :key="metricName"
          :title="tooltip"
          :class="{ selected: cvss4Selections[MetricNamesWithValues[categoryName]][metric.short] === value }"
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
@/composables/useCvss4