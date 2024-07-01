<script setup lang="ts">
import { computed } from 'vue';
import type { ZodFlawType } from '@/types/zodFlaw';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';

const modelValue = defineModel<ZodFlawType>({ required: true });

const rhCvss = computed(() => modelValue.value?.cvss_scores
  .findIndex((cvss) => cvss.issuer === 'RH'
    && cvss.cvss_version === 'V3'));
</script>

<template>
  <LabelCollapsible
    v-if="rhCvss > -1"
    label="Explain non-obvious CVSSv3 score metrics"
    class="mb-3 cvss-score-mismatch"
  >
    <textarea
      v-model="modelValue.cvss_scores[rhCvss].comment"
      rows="5"
      class="form-control col-9 d-inline-block"
      placeholder="CVSS Score Explanation"
    />
  </LabelCollapsible>
</template>
