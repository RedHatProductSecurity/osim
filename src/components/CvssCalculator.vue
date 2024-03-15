<script setup lang="ts">
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import LabelInputCollapsable from './widgets/LabelInputCollapsable.vue';
import { calculatorButtons } from '@/composables/useCvssCalculator';
import { ref } from 'vue';


const cvssVector = defineModel<string | undefined | null>('cvssVector');
const cvssScore = defineModel<number | null>('cvssScore');

const tabIndex = ref(0);
</script>

<template>
  <LabelInputCollapsable
    ref="inputVector"
    v-model="cvssVector"
    label="CVSSv3"
    type="text"
  >
    <div class="osim-input" v-bind="$attrs">
      <div class="ps-3 mb-3">
        <div ref="collapsibleCalculator">
          <div class="btn-group btn-group-sm w-100">
            <template v-for="(block, index) in calculatorButtons.blocks" :key="index">
              <button
                type="button"
                class="btn tab border-bottom"
                :class="{'border': tabIndex === index}"
                @click="() => tabIndex=index"
                @mousedown="event => event.preventDefault()"
              >
                {{ block.name }}
              </button>
            </template>
          </div>
          <div 
            v-for="(row, rowIndex) in calculatorButtons.blocks[tabIndex].rows" 
            :key="rowIndex" 
            class="d-flex flex-row my-2"
          >
            <div
              v-for="(col, colIndex) in row.cols"
              :key="colIndex" 
              class="d-flex flex-column mx-1"
            >
              <div class="btn-group-vertical btn-group-sm">
                <button class="btn btn-primary lh-sm" disabled>{{ col.label }}</button>
                <template v-for="(button, index) in col.buttons" :key="index">
                  <button
                    type="button"
                    class="btn btn-secondary lh-sm"
                    :class="{'rounded-0': index === 0}"
                    @click="button.action"
                    @mousedown="event => event.preventDefault()"
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
  </LabelInputCollapsable>
  <LabelStatic
    v-model="cvssScore"
    label="CVSSv3 Score"
    type="text"
  />
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
