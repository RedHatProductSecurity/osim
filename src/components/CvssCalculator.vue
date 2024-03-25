<script setup lang="ts">
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelInputCollapsable from './widgets/LabelInputCollapsable.vue';
import { 
  calculatorButtons,
  getFactors,
  formatFactor,
  calculateBaseScore,
} from '@/composables/useCvssCalculator';
import { ref } from 'vue';


const cvssVector = defineModel<string | undefined | null>('cvssVector');
const cvssScore = defineModel<number | null>('cvssScore');

const tabIndex = ref(0);

const cvssFactors = ref();

function updateFactors(newCvssVector: string | undefined | null){
  if(newCvssVector){
    console.log(newCvssVector);
    cvssFactors.value = getFactors(newCvssVector);
  } else {
    cvssFactors.value = getFactors('CVSS:3.1');
  }
}

updateFactors(cvssVector.value);

function calcButton(id: string, key: string) {
  if(!cvssFactors.value['CVSS']) {
    cvssFactors.value = getFactors('CVSS:3.1');
  }
  cvssFactors.value[id] = key;
  cvssScore.value = calculateBaseScore(cvssFactors.value);
}
</script>

<template>
  <LabelInputCollapsable
    label="CVSSv3"
    type="custom"
    @custom-input-change="updateFactors"
  >
    <template #customInput>
      <template v-for="(value, key) in cvssFactors" :key="key">
        <span v-if="value">
          {{ formatFactor(key.toString(),value) }}
        </span>
      </template>
    </template>
    <template #collapsable>
      <div class="osim-input" v-bind="$attrs">
        <div class="ps-3 mb-3">
          <div ref="collapsibleCalculator">
            <div class="btn-group btn-group-sm w-100">
              <template v-for="(block, blockIndex) in calculatorButtons.blocks" :key="blockIndex">
                <button
                  type="button"
                  class="btn tab border-bottom"
                  :class="{'border': tabIndex === blockIndex}"
                  @click="() => tabIndex=blockIndex"
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
                  <template v-for="(button, btnIndex) in col.buttons" :key="btnIndex">
                    <button
                      type="button"
                      class="btn btn-secondary lh-sm"
                      :class="{
                        'bg-warning ': 
                          cvssFactors[col.id]
                          === button.key
                      }"
                      @click="calcButton(col.id, button.key)"
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
    </template>
  </LabelInputCollapsable>
  <LabelInput
    v-model="cvssScore"
    label="CVSSv3 Score"
    type="text"
    :hasTopLabelStyle="false"
  />
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
