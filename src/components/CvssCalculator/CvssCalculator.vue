<script setup lang="ts">
import { computed,
  ref } from 'vue';

import CvssVectorInput from '@/components/CvssCalculator/CvssVectorInput.vue';
import Cvss3Calculator from '@/components/CvssCalculator/Cvss3Calculator/Cvss3Calculator.vue';
import Cvss4Calculator from '@/components/CvssCalculator/Cvss4Calculator/Cvss4Calculator.vue';

import { useCvssScores,
  validateCvssVector } from '@/composables/useCvssScores';
import {
  getFactors,
  calculateScore,
  formatFactors,
} from '@/composables/useCvss3Calculator';

import RedHatIconSvg from '@/assets/Logo-Red_Hat-Hat_icon-Standard-RGB.svg';
import { CvssVersions, CvssVersionDisplayMap } from '@/constants';

const { cvss3Factors,
  cvss4Score,
  cvss4Selections,
  cvss4Vector,
  cvssScore,
  cvssVector,
  cvssVersion,
  setMetric,
  shouldSyncCvssFactors,
  updateCvss3Factors,
  updateScore,
  updateVector,
} = useCvssScores();

const error = computed(() => validateCvssVector(cvssVector.value,
  cvssVersion.value));
const isFocused = ref(false);

const cvssDiv = ref();
const cvssVectorInput = ref();

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
  updateScore(null);
  updateVector(null);
  cvss3Factors.value = {};
}

function handlePaste(e: ClipboardEvent) {
  const maybeCvss = e.clipboardData?.getData('text');
  if (!maybeCvss) {
    return;
  }

  updateCvss3Factors(maybeCvss);
  if (!getFactors(maybeCvss)['CVSS']) {
    cvss3Factors.value['CVSS'] = '3.1';
  }

  updateCvss3Factors(formatFactors(cvss3Factors.value));
  updateScore(calculateScore(cvss3Factors.value) ?? 0);
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
      <label class="label-group row" aria-role="red-hat-cvss">
        <span class="form-label col-3 pe-1">
          <img
            :src="RedHatIconSvg"
            alt="Red Hat Logo"
            width="24px"
            class="me-2"
          />
          CVSS
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
          <span class="bg-light rounded ms-2 px-2" title="Synchronize factors between CVSS3 and CVSS4">
            <i
              class="bi bi-repeat me-1"
              style="cursor: help; height: 24px; width: 24px; stroke: black; vertical-align: middle;"
            ></i>
            <input
              v-model="shouldSyncCvssFactors"
              type="checkbox"
              class="form-check-input"
            />
          </span>
        </span>
        <div class="input-wrapper col">
          <CvssVectorInput
            ref="cvssVectorInput"
            :cvss3Factors="cvss3Factors"
            :cvssScore="cvssScore ?? null"
            :isFocused="isFocused"
            :highlightedFactor="highlightedFactor"
            :error="error"
            class="vector-input"
            @onInputFocus="onInputFocus"
            @onInputBlur="onInputBlur"
            @highlightFactor="highlightFactor"
            @updateCvss3Factors="updateCvss3Factors(cvssVector)"
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
      v-model:cvss3Factors="cvss3Factors"
      :highlightedFactor="highlightedFactor"
      :highlightedFactorValue="highlightedFactorValue"
      :isFocused="isFocused && cvssVersion === CvssVersions.V3"
      :cvssScore="cvssScore"
      :cvssVector="cvssVector ?? null"
      class="overlayed"
      @update:cvssScore="updateScore"
      @update:cvssVector="updateVector"
      @highlightFactor="highlightFactor"
      @highlightFactorValue="highlightFactorValue"
    />
    <Cvss4Calculator
      v-else-if="cvssVersion === CvssVersions.V4"
      v-model:cvss3Factors="cvss3Factors"
      :highlightedFactor="highlightedFactor"
      :highlightedFactorValue="highlightedFactorValue"
      :isFocused="isFocused && cvssVersion === CvssVersions.V4"
      :cvss4Score="cvss4Score"
      :cvss4Vector="cvss4Vector"
      :cvss4Selections="cvss4Selections"
      @update:cvssScore="updateScore"
      @update:cvssVector="updateVector"
      @update:setMetric="setMetric"
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
