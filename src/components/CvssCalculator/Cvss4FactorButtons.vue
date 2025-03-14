<script setup lang="ts">
import { watch } from 'vue';

import { useCvss4Selections, useCvss4Calculations } from '@/composables/useCvss4';
import {
  getFactors,
  calculateScore,
  formatFactors,
} from '@/composables/useCvssCalculator';

import { CVSS4MetricsForUI, MetricNamesWithValues } from '@/utils/cvss40';

defineProps<{
  highlightedFactor: null | string;
  highlightedFactorValue: null | string;
  isFocused: boolean;
}>();
const cvssVector = defineModel<null | string | undefined>('cvssVector');
const cvssScore = defineModel<null | number | undefined>('cvssScore');
const cvssFactors = defineModel<Record<string, string>>('cvssFactors', { default: () => ({}) });
const emit = defineEmits<{
  highlightFactor: [factor: null | string];
  highlightFactorValue: [factor: null | string];
}>();
const { error, score, vectorString } = useCvss4Calculations();
const { cvss4Selections } = useCvss4Selections();
function setMetric(category: string, metric: string, value: string) {
  console.log(category, metric, value);
  cvss4Selections.value[category][metric] = value;
  console.log(cvss4Selections.value);
}
function updateFactors(newCvssVector: null | string | undefined) {
  if (cvssVector.value !== newCvssVector) {
    cvssVector.value = newCvssVector;
  }
  cvssFactors.value = getFactors(newCvssVector ?? '');
}

updateFactors(cvssVector.value);

watch(() => cvssVector.value, () => {
  updateFactors(cvssVector.value);
});

function factorButton(id: string, key: string) {
  if (!cvssFactors.value['CVSS']) {
    cvssFactors.value['CVSS'] = '3.1';
  }
  cvssFactors.value[id] = cvssFactors.value[id] === key ? '' : key;
  updateFactors(formatFactors(cvssFactors.value));
  cvssScore.value = calculateScore(cvssFactors.value);
}
</script>

<template>
  <div
    class="cvss-calculator"
    :class="{ 'visually-hidden': !isFocused, 'mt-2': cvssVector, }"
    v-bind="$attrs"
  >
    <div class="p-3">
      <slot />
      <div
        class="osim-input mx-0"
      >
        <div class="mx-auto">
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
                  :class="{
                    selected: cvss4Selections?.[MetricNamesWithValues?.[categoryName]]?.[metric.short] === value
                  }"
                  @click="setMetric(MetricNamesWithValues[categoryName], metric.short, value)"
                >
                  {{ metricName }}</button>

                <div>
                </div>
              </div>
            </div>

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
</style>
