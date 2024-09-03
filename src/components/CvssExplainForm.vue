<script setup lang="ts">
import { computed } from 'vue';

import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';

import type { ZodFlawType } from '@/types/zodFlaw';
import { CVSS_V3 } from '@/constants';

const modelValue = defineModel<ZodFlawType>({ required: true });

const rhCvss = computed(() => modelValue.value?.cvss_scores
  .findIndex((cvss) => cvss.issuer === 'RH'
    && cvss.cvss_version === CVSS_V3));
</script>

<template>
  <LabelCollapsible
    v-if="rhCvss > -1"
    label="Explain non-obvious CVSSv3 score metrics"
    class="ms-2 cvss-score-mismatch"
  >
    <textarea
      v-model="modelValue.cvss_scores[rhCvss].comment"
      rows="3"
      class="form-control col-9 d-inline-block mb-3"
      placeholder="CVSS Score Explanation"
    />
  </LabelCollapsible>
</template>
