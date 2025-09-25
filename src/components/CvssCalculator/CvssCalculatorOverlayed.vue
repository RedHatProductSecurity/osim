<script setup lang="ts">
import { computed, ref } from 'vue';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';

import CvssCalculatorBase from './CvssCalculatorBase.vue';

const props = defineProps<{
  affect: ZodAffectType;
}>();

const cvssScore = computed(() => affectRhCvss3(props.affect));
const showCalculator = ref(false);

function updateAffect(cvssScores: ZodAffectCVSSType[]) {
  // This mutation was hidden by using the `useCvssCalculator` composable
  // eslint-disable-next-line vue/no-mutating-props
  props.affect.cvss_scores = cvssScores;
}
</script>

<template>
  <div
    tabindex="0"
    @click="showCalculator = !showCalculator"
  >
    <span>{{ cvssScore?.score }}</span>
    <i class="bi bi-calculator-fill p-2" />
    <CvssCalculatorBase
      v-if="showCalculator"
      :cvssEntity="affect"
      class="overlayed"
      @click.stop
      @blur="showCalculator = !showCalculator"
      @change:cvss_scores="updateAffect"
    />
  </div>
</template>
