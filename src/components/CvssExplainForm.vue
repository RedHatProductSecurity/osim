<script setup lang="ts">
import { computed, ref } from 'vue';

import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';

import type { ZodFlawType } from '@/types/zodFlaw';
import { CVSS_V3 } from '@/constants';

const modelValue = defineModel<ZodFlawType>({ required: true });

const rhCvss = computed(() => modelValue.value?.cvss_scores
  .findIndex(cvss => cvss.issuer === 'RH'
  && cvss.cvss_version === CVSS_V3));

const isExpanded = ref(false);
</script>

<template>
  <LabelCollapsible
    v-if="rhCvss > -1"
    :isExpanded="isExpanded"
    label="Explain non-obvious CVSSv3 score metrics"
    class="ms-2 cvss-score-mismatch"
    @toggleExpanded="isExpanded = !isExpanded"
  >
    <textarea
      v-model="modelValue.cvss_scores[rhCvss].comment"
      rows="3"
      class="form-control col-9 d-inline-block mb-3"
      placeholder="CVSS Score Explanation"
    />
  </LabelCollapsible>
</template>
