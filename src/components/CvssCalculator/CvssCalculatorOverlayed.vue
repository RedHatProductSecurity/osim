<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CvssVectorInput from '@/components/CvssCalculator/CvssVectorInput.vue';
import Cvss3Calculator from '@/components/CvssCalculator/Cvss3Calculator/Cvss3Calculator.vue';

import {
  parseCvss3Factors,
  calculateCvss3Score,
  formatCvss3Factors,
} from '@/composables/useCvss3Calculator';
import { useCvssScores, validateCvssVector } from '@/composables/useCvssScores';

import { CvssVersions } from '@/constants';
import type { ZodAffectType } from '@/types';

const props = defineProps<{
  affect: ZodAffectType;
}>();

const { cvss3Factors, cvssScore, cvssVector, cvssVersion, updateScore, updateVector } = useCvssScores(props.affect);

const error = computed(() => validateCvssVector(cvssVector.value, cvssVersion.value) ?? null);
const isFocused = ref(false);
const cvssDiv = ref();
const cvssVectorInput = ref();

function updateUsingV3Vector(newCvssVector: null | string | undefined) {
  if (cvssVector.value !== newCvssVector) {
    updateCvss(newCvssVector);
  }
  cvss3Factors.value = parseCvss3Factors(newCvssVector ?? '');
}

watch(() => cvssVector.value, () => {
  updateUsingV3Vector(cvssVector.value);
  updateCvss(cvssVector.value);
}, { immediate: true });

function onInputFocus(event: FocusEvent) {
  isFocused.value = true;
  if (event.target !== cvssVectorInput.value.input) {
    cvssVectorInput.value.input.focus();
  }
}

function onInputBlur(event: FocusEvent) {
  if (event.relatedTarget !== cvssDiv.value) {
    isFocused.value = false;
  }
}

function reset() {
  updateScore(null);
  updateVector(null);
  cvss3Factors.value = {};
}

function handlePaste(e: ClipboardEvent) {
  const maybeCvss = e.clipboardData?.getData('text');
  if (!maybeCvss) {
    return;
  }

  updateUsingV3Vector(maybeCvss);
  if (!parseCvss3Factors(maybeCvss)['CVSS']) {
    cvss3Factors.value['CVSS'] = '3.1';
  }

  updateUsingV3Vector(formatCvss3Factors(cvss3Factors.value));
  updateScore(calculateCvss3Score(cvss3Factors.value));
  updateVector(maybeCvss);
}

function updateCvss(vector: null | string = null) {
  updateUsingV3Vector(vector);
  updateScore(calculateCvss3Score(cvss3Factors.value));
  updateVector(vector);
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
    @focus="onInputFocus"
    @paste="handlePaste"
  >
    <span>{{ cvssScore }}</span>
    <i class="bi bi-calculator-fill p-2" />
    <Cvss3Calculator
      v-model:cvss3Factors="cvss3Factors"
      :highlightedFactor="highlightedFactor"
      :highlightedFactorValue="highlightedFactorValue"
      :isFocused="isFocused"
      :cvssVector="cvssVector ?? null"
      class="overlayed"
      @update:cvssScore="updateScore"
      @update:cvssVector="updateVector"
      @highlightFactor="highlightFactor"
      @highlightFactorValue="highlightFactorValue"
    >
      <div class="osim-input">
        <div class="input-wrapper col">
          <CvssVectorInput
            ref="cvssVectorInput"
            :cvss3Factors="cvss3Factors"
            :selectedVersion="CvssVersions.V3"
            :cvss4Vector="null"
            :cvssScore="cvssScore ?? null"
            :isFocused="isFocused"
            :highlightedFactor="highlightedFactor"
            :error="error"
            class="vector-input"
            style="height: 30.8px;"
            @onInputFocus="onInputFocus"
            @onInputBlur="onInputBlur"
            @highlightFactor="highlightFactor"
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
.osim-input {
  display: inline-flex;
  width: 100%;

  .input-wrapper {
    padding-inline: 0;
    margin-inline: 0;

    .vector-input {
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
