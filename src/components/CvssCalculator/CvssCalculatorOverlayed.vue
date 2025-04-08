<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CvssVectorInput from '@/components/CvssCalculator/CvssVectorInput.vue';
import Cvss3Calculator from '@/components/CvssCalculator/Cvss3Calculator/Cvss3Calculator.vue';

import {
  getFactors,
  calculateScore,
  formatFactors,
  validateCvssVector,
} from '@/composables/useCvssCalculator';

const cvssVector = defineModel<null | string | undefined>('cvssVector');
const cvssScore = defineModel<null | number | undefined>('cvssScore');
const affectCalculatorIndex = defineModel<number>('affectCalculatorIndex', { default: -1 });

const emit = defineEmits<{
  updateAffectCvss: [vector: string, score: null | number];
}>();

const error = computed(() => validateCvssVector(cvssVector.value));
const cvssFactors = ref<Record<string, string>>({});
const isFocused = ref(false);

const cvssDiv = ref();
const cvssVectorInput = ref();

function updateFactors(newCvssVector: null | string | undefined) {
  if (cvssVector.value !== newCvssVector) {
    emit('updateAffectCvss', newCvssVector || '', calculateScore(cvssFactors.value) || null);
  }
  cvssFactors.value = getFactors(newCvssVector ?? '');
}

updateFactors(cvssVector.value);

watch(() => cvssVector.value, () => {
  updateFactors(cvssVector.value);
  emit('updateAffectCvss', cvssVector.value || '', calculateScore(cvssFactors.value) || null);
});

// function onInputFocus(event: FocusEvent) {
//   isFocused.value = true;
//   if (event.target !== cvssVectorInput.value.input) {
//     cvssVectorInput.value.input.focus();
//   }
// }

function onInputBlur(event: FocusEvent) {
  if (event.relatedTarget !== cvssDiv.value) {
    affectCalculatorIndex.value = -1;
  }
}

function reset() {
  cvssScore.value = null;
  emit('updateAffectCvss', '', null);
  cvssFactors.value = {};
}

function handlePaste(e: ClipboardEvent) {
  const maybeCvss = e.clipboardData?.getData('text');
  if (!maybeCvss) {
    return;
  }

  updateFactors(maybeCvss);
  if (!getFactors(maybeCvss)['CVSS']) {
    cvssFactors.value['CVSS'] = '3.1';
  }

  updateFactors(formatFactors(cvssFactors.value));
  cvssScore.value = calculateScore(cvssFactors.value);
}

const highlightedFactor = ref<null | string>(null);
const highlightedFactorValue = ref<null | string>(null);

function highlightFactor(factor: null | string) {
  highlightedFactor.value = factor;
}

function highlightFactorValue(factor: null | string) {
  highlightedFactorValue.value = factor;
}
</script>

<template>
  <div
    ref="cvssDiv"
    tabindex="0"
    class="overlayed"
    @paste="handlePaste"
  >
    <Cvss3Calculator
      v-model:cvssVector="cvssVector"
      v-model:cvssScore="cvssScore"
      v-model:cvssFactors="cvssFactors"
      :highlightedFactor="highlightedFactor"
      :highlightedFactorValue="highlightedFactorValue"
      :isFocused="affectCalculatorIndex > -1"
      @highlightFactor="highlightFactor"
      @highlightFactorValue="highlightFactorValue"
    >
      <div class="osim-input">
        <div class="input-wrapper col">
          <CvssVectorInput
            ref="cvssVectorInput"
            :cvssVector="cvssVector"
            :cvssScore="cvssScore"
            :cvssFactors="cvssFactors"
            :isFocused="isFocused"
            :highlightedFactor="highlightedFactor"
            :error="error"
            class="vector-input"
            @onInputBlur="onInputBlur"
            @highlightFactor="highlightFactor"
            @updateFactors="updateFactors(cvssVector)"
          />
        </div>
        <button
          tabindex="-1"
          type="button"
          :disabled="!cvssVector"
          class="erase-button input-group-text"
          @click="reset()"
          @mousedown="(event: MouseEvent) => event.preventDefault()"
        >
          <i class="bi bi-eraser"></i>
        </button>
      </div>
    </Cvss3Calculator>
  </div>
</template>

<style scoped lang="scss">
.overlayed {
  display: block;
  background-color: #525252;
  border-radius: 10px;
}

.osim-input {
  display: inline-flex;
  width: 100%;

  .input-wrapper {
    padding-inline: 0;
    margin-inline: 0;

    .vector-input {
      min-height: 30.8px;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      padding: 0.15rem 0.5rem;
    }
  }

  .erase-button {
    height: 30.8px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: 0;
  }
}
</style>
