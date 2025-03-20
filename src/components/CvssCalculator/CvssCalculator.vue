<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CvssVectorInput from '@/components/CvssCalculator/CvssVectorInput.vue';
import Cvss3Calculator from '@/components/CvssCalculator/Cvss3Calculator/Cvss3Calculator.vue';
import Cvss4Calculator from '@/components/CvssCalculator/Cvss4Calculator/Cvss4Calculator.vue';

import {
  getFactors,
  calculateScore,
  formatFactors,
  validateCvssVector,
} from '@/composables/useCvssCalculator';

import { CvssVersions, CvssVersionDisplayMap } from '@/constants';

const cvssVector = defineModel<null | string | undefined>('cvssVector');
const cvssScore = defineModel<null | number | undefined>('cvssScore');
const cvssVersion = defineModel<null | string | undefined>('cvssVersion');

const error = computed(() => validateCvssVector(cvssVector.value));
const cvssFactors = ref<Record<string, string>>({});
const isFocused = ref(false);

const cvssDiv = ref();
const cvssVectorInput = ref();

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

function onInputFocus(event: FocusEvent) {
  event.stopPropagation();
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
  cvssScore.value = null;
  cvssVector.value = null;
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
    @focus="onInputFocus"
    @paste="handlePaste"
  >
    <div class="osim-input mb-2">
      <label class="label-group row">
        <span class="form-label col-3">
          RH CVSS
          <select
            v-model="cvssVersion"
            class="ms-2"
          >
            <option
              v-for="(version, index) in CvssVersions"
              :key="index"
              :value="version"
              :selected="cvssVersion === version"
            >
              {{ CvssVersionDisplayMap[version] }}
            </option>
          </select>
        </span>
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
            @onInputFocus="onInputFocus"
            @onInputBlur="onInputBlur"
            @highlightFactor="highlightFactor"
            @updateFactors="updateFactors(cvssVector)"
            @click.prevent
          />
        </div>
        <div
          v-if="error"
          class="invalid-tooltip"
        >
          {{ error }}
        </div>
      </label>
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
    <Cvss3Calculator
      v-if="cvssVersion === CvssVersions.V3"
      v-model:cvssVector="cvssVector"
      v-model:cvssScore="cvssScore"
      v-model:cvssFactors="cvssFactors"
      :highlightedFactor="highlightedFactor"
      :highlightedFactorValue="highlightedFactorValue"
      :isFocused="isFocused && cvssVersion === CvssVersions.V3"
      @highlightFactor="highlightFactor"
      @highlightFactorValue="highlightFactorValue"
    />
    <Cvss4Calculator
      v-else-if="cvssVersion === CvssVersions.V4"
      v-model:cvssVector="cvssVector"
      v-model:cvssScore="cvssScore"
      v-model:cvssFactors="cvssFactors"
      :highlightedFactor="highlightedFactor"
      :highlightedFactorValue="highlightedFactorValue"
      :isFocused="isFocused && cvssVersion === CvssVersions.V4"
      :cvssVersion
    />
  </div>
</template>

<style scoped lang="scss">
.osim-input {
  display: inline-flex;
  width: 100%;

  .label-group {
    width: 100%;
    position: relative;
    min-height: 38px;
    margin-inline: 0;
    padding-left: 0.25rem;
    height: 100%;

    .form-label {
      min-width: 14.375rem;
    }

    .input-wrapper {
      z-index: 15;
      padding-inline: 0;
      margin-inline: 0;
    }
  }

  .vector-input {
    height: 100%;
    border-radius: 0;
    padding-left: 0.75rem;
  }

  .erase-button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: 0;
  }
}
</style>
