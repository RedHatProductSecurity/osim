<script setup lang="ts">
import {
  MetricNamesWithValues,
  CVSS4MetricsForUI,
} from '@/components/CvssCalculator/Cvss4Calculator/cvss4-ui-constants';

import { METRICS, type MetricsGroup } from '@/utils/cvss40';

defineProps<{
  cvss4Score: null | number;
  cvss4Selections: any;
  cvss4Vector: null | string;
  isFocused: boolean;
}>();

const emit = defineEmits<{
  'update:setMetric': [category: string, metric: string, value: string];
}>();

function metricValueColor(group: MetricsGroup, metric: string, value: string, isSelected: boolean) {
  const metricValuesCount = METRICS[group][metric].length;
  const metricPosition = METRICS[group][metric].indexOf(value);
  const weight = metricPosition / (metricValuesCount - 1);

  const hue = weight * 80; // red being 0, 80 being green
  const alpha = 1;
  const sat = isSelected ? 100 : 30;

  const hslForText = `hsla(${hue}, ${sat}%, 35%, ${alpha})`;
  const hslForBackground = `hsla(${hue}, ${sat}%, 95%, ${alpha})`;
  return {
    'color': hslForText,
    'background-color': hslForBackground,
    'border-color': isSelected ? `${hslForText} !important` : undefined,
  };
};
</script>

<template>
  <div class="p-4 pt-2 cvss-calculator">
    <div
      v-for="(category, categoryName) in CVSS4MetricsForUI"
      :key="categoryName"
      class="mb-2 bg-light-gray"
    >
      <div
        v-if="categoryName === 'Base Metrics'"
        class="p-3 justify-content-between"
      >
        <div
          v-for="(metricGroup, groupName) in category.metric_groups"
          :key="groupName"
          class="p-2"
        >
          <div class="p-2">
            <div
              v-for="(metric, metricName) in metricGroup as Record<string, any>"
              :key="metricName"
              class="p-1 btn-group-horizontal btn-group-sm osim-factor-severity-select"
            >
              <button
                class="btn-group-header btn btn-secondary fw-bold lh-sm border"
                style="max-height: 27.5px;"
                disabled
              >
                {{ metricName }}
              </button>
              <button
                v-for="{tooltip, value}, optionName in metric.options"
                :key="optionName"
                tabindex="-1"
                type="button"
                class="btn factor-btn lh-sm border"
                style="max-height: 27.5px;"
                :style="metricValueColor(
                  MetricNamesWithValues[categoryName],
                  metric.short,
                  value,
                  cvss4Selections?.[MetricNamesWithValues?.[categoryName]]?.[metric.short] === value,
                )"
                :title="tooltip"
                :class="{
                  selected: cvss4Selections?.[MetricNamesWithValues?.[categoryName]]?.[metric.short] === value
                }"
                @click="emit('update:setMetric',MetricNamesWithValues[categoryName], metric.short, value)"
              >
                {{ optionName }}
              </button>
            </div>
          </div>
          <div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cvss-calculator {
  &.overlayed {
    display: block;
    transform: translateX(-25ch);
    background-color: #525252;
    border-radius: 10px;
    z-index: 5;
    position: absolute;
  }

  .factor-btn.selected {
    border-style: solid;
    border-width: 3px;
  }
}
</style>
