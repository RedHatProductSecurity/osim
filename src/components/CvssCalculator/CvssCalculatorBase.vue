<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue';

import { useCvssScores, validateCvssVector } from '@/composables/useCvssScores';
import { calculateCvss3Score, parseCvss3Factors } from '@/composables/useCvss3Calculator';

import type { CvssEntity, ZodAffectCVSSType } from '@/types';
import { CvssVersions } from '@/constants';
import { deepCopyFromRaw, jsonEquals } from '@/utils/helpers';

import Cvss3Calculator from './Cvss3Calculator/Cvss3Calculator.vue';
import CvssVectorInput from './CvssVectorInput.vue';

const props = defineProps<{
  cvssEntity: CvssEntity;
}>();

const emit = defineEmits<{
  'blur': [FocusEvent];
  'change:cvss_scores': [ZodAffectCVSSType[]];
}>();

const highlightedFactor = ref<null | string>(null);
const highlightedFactorValue = ref<null | string>(null);
const cvssDiv = ref();
const isFocused = ref(false);
const cvssVectorInput = ref();
const cvssEntity = ref<CvssEntity>(deepCopyFromRaw(toRaw(props.cvssEntity)));

const {
  cvss3Factors,
  cvssScore,
  cvssVector,
  cvssVersion,
  updateScore,
  updateVector,
} = useCvssScores(cvssEntity.value);

const error = computed(() => validateCvssVector(cvssVector.value, cvssVersion.value) ?? null);

watch(() => cvssEntity.value, (entity) => {
  if (!jsonEquals(props.cvssEntity.cvss_scores, entity.cvss_scores)) {
    emit('change:cvss_scores', entity.cvss_scores);
  }
}, { deep: true });

watch(
  () => cvssVector.value,
  () => {
    updateUsingV3Vector(cvssVector.value);
    updateCvss(cvssVector.value);
  },
  { immediate: true },
);

function onInputBlur(event: FocusEvent) {
  if (event.relatedTarget !== cvssDiv.value) {
    isFocused.value = false;
    emit('blur', event);
  }
}

function onInputFocus(event: FocusEvent) {
  isFocused.value = true;
  if (event.target !== cvssVectorInput.value.input) {
    cvssVectorInput.value.input.focus();
  }
}

function reset() {
  updateScore(null);
  updateVector(null);
  cvss3Factors.value = {};
}

function updateUsingV3Vector(newCvssVector: null | string | undefined) {
  if (cvssVector.value !== newCvssVector) {
    updateCvss(newCvssVector);
  }
  cvss3Factors.value = parseCvss3Factors(newCvssVector ?? '');
}

function updateCvss(vector: null | string = null) {
  updateUsingV3Vector(vector);
  updateScore(calculateCvss3Score(cvss3Factors.value));
  updateVector(vector);
}

function handlePaste(e: ClipboardEvent) {
  const maybeCvss = e.clipboardData?.getData('text');
  if (!maybeCvss) {
    return;
  }

  cvss3Factors.value = parseCvss3Factors(maybeCvss);
  if (!cvss3Factors.value['CVSS']) {
    cvss3Factors.value['CVSS'] = '3.1';
  }
  // updateUsingV3Vector(maybeCvss);
  updateScore(calculateCvss3Score(cvss3Factors.value));
  updateVector(maybeCvss);
}

function highlightFactor(factor: null | string) {
  highlightedFactor.value = factor;
}

function highlightFactorValue(factor: null | string) {
  highlightedFactorValue.value = factor;
}

onMounted(() => {
  onInputFocus({ target: null } as FocusEvent);
});
</script>

<template>
  <Cvss3Calculator
    v-model:cvss3Factors="cvss3Factors"
    :highlightedFactor="highlightedFactor"
    :highlightedFactorValue="highlightedFactorValue"
    isFocused
    :cvssVector="cvssVector ?? null"
    @update:cvssScore="updateScore"
    @update:cvssVector="updateVector"
    @highlightFactor="highlightFactor"
    @highlightFactorValue="highlightFactorValue"
    @paste="handlePaste"
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
</template>
<style scoped lang="scss">
.overlayed {
  .osim-input {
    &:first-of-type {
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
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: 0;
      }
    }
  }
}
</style>
