<script setup lang="ts">
import { watch } from 'vue';

import { MetricNamesWithValues, CVSS4MetricsForUI }
  from '@/components/CvssCalculator/Cvss4Calculator/cvss4-ui-constants';

import type { ZodAffectType } from '@/types';

const props = defineProps<{
  affect?: ZodAffectType;
  cvss4Score: null | number;
  cvss4Selections: any;
  cvss4Vector: null | string;
  highlightedFactor: null | string;
  highlightedFactorValue: null | string;
  isFocused: boolean;
}>();

const emit = defineEmits<{
  'update:cvssScore': [value: null | number];
  'update:cvssVector': [value: null | string];
  'update:setMetric': [category: string, metric: string, value: string];
}>();

function updateCvss4Score(newCvss4Score: null | number | undefined) {
  emit('update:cvssScore', newCvss4Score ?? null);
}

function updateCvss4Vector(newCvss4Vector: null | string | undefined) {
  emit('update:cvssVector', newCvss4Vector ?? null);
}

// TODO: Move these into composable?
watch(() => props.cvss4Score, updateCvss4Score);
watch(() => props.cvss4Vector, updateCvss4Vector);
</script>

<template>
  <div class="p-4 pt-2 cvss-calculator">
    <p class="mb-0 px-2 bg-light-gray">
      <b class="me-2">{{ cvss4Score }}</b>
      {{ cvss4Vector }}
    </p>
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
              class="p-2 btn-group-vertical btn-group-sm osim-factor-severity-select"
              style="vertical-align: top;"
            >
              <button
                class="btn-group-header btn btn-secondary fw-bold lh-sm border"
                :class="{ 'osim-factor-highlight': metric.id === highlightedFactor}"
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

  .osim-input {
    display: flex;
    width: 100%;

    .row-group {
      display: flex;
      flex-direction: row;
      margin-block: 10px;

      .col-group {
        display: flex;
        flex-direction: column;
        margin-inline: 5px;
        width: 100%;

        .btn-group-header {
          background-color: #1f1f1f !important;
          color: white;
          border: 0;
          padding-block: 7.5px;
          font-weight: 600;

          &.osim-factor-highlight {
            background-color: hsl(200deg 100% 95%) !important;
            color: hsl(200deg 100% 35%) !important;
          }
        }

        .btn,
        .btn:hover {
          border: 1px;
          margin: auto;
        }

        &:hover .osim-factor-highlight {
          background-color: hsl(200deg 100% 95%) !important;
          color: hsl(200deg 100% 35%) !important;
        }
      }
    }
  }
}

.factor-btn.selected {
  background-color: gray;
  color: white;
}
</style>
