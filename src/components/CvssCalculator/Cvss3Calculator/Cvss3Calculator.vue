<script setup lang="ts">
import { watch } from 'vue';

import {
  calculatorButtons,
  getFactors,
  getFactorColor,
  calculateScore,
  formatFactors,
  factorSeverities,
  weights,
} from '@/composables/useCvss3Calculator';

import type { ZodAffectType } from '@/types';

const props = defineProps<{
  affect?: ZodAffectType;
  cvssVector: null | string;
  highlightedFactor: null | string;
  highlightedFactorValue: null | string;
  isFocused: boolean;
}>();

const cvssFactors = defineModel<Record<string, string>>('cvssFactors', { default: () => ({}) });

const emit = defineEmits<{
  'highlightFactor': [factor: null | string];
  'highlightFactorValue': [factor: null | string];
  'update:cvssScore': [value: null | number];
  'update:cvssVector': [value: null | string];
}>();

function updateCvss3Factors(newCvssVector: null | string | undefined) {
  cvssFactors.value = getFactors(newCvssVector ?? '');
  if (props.cvssVector !== newCvssVector) {
    emit('update:cvssVector', newCvssVector ?? null);
  }
}

watch(() => props.cvssVector, updateCvss3Factors, { immediate: true });

function factorButton(id: string, key: string) {
  if (!cvssFactors.value['CVSS']) {
    cvssFactors.value['CVSS'] = '3.1';
  }

  cvssFactors.value[id] = cvssFactors.value[id] === key ? '' : key;
  updateCvss3Factors(formatFactors(cvssFactors.value));
  emit('update:cvssScore', calculateScore(cvssFactors.value) ?? 0);
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
          <div
            v-for="(row, rowIndex) in calculatorButtons.rows"
            :key="rowIndex"
            class="row-group"
          >
            <div
              v-for="(col, colIndex) in row.cols"
              :key="colIndex"
              class="col-group"
            >
              <div
                class="btn-group-vertical btn-group-sm osim-factor-severity-select"
                @mouseover="emit('highlightFactor',col.id)"
                @mouseleave="emit('highlightFactor',null)"
              >
                <button
                  class="btn-group-header btn lh-sm"
                  :class="{ 'osim-factor-highlight': col.id === highlightedFactor}"
                  disabled
                >{{ col.label }}</button>
                <template v-for="(button, btnIndex) in col.buttons" :key="btnIndex">
                  <button
                    tabindex="-1"
                    type="button"
                    class="btn lh-sm"
                    :class="cvssFactors[col.id] === button.key ? 'osim-factor-highlight' : ''"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    :title="`${factorSeverities[col.id][button.key]}: ${button.info}`"
                    :style="
                      cvssFactors[col.id] === button.key
                        || highlightedFactorValue === `${rowIndex}${colIndex}${btnIndex}` ?
                          getFactorColor(weights[col.id][button.key], false, highlightedFactor) : {
                          backgroundColor: '#E0E0E0',
                          color: (cvssFactors[col.id] === button.key
                            && factorSeverities[col.id][button.key] !== 'Bad')
                            ? 'white'
                            : 'inherit'
                        }"
                    @click="factorButton(col.id, button.key)"
                    @mousedown="(event: MouseEvent) => event.preventDefault()"
                    @mouseover="emit('highlightFactorValue',`${rowIndex}${colIndex}${btnIndex}`)"
                    @mouseout="emit('highlightFactorValue',null)"
                  >
                    {{ button.name }}
                  </button>
                </template>
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
    left: 5ch;
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
