<script setup lang="ts">
import AegisMitigationActions from '@/components/Aegis/AegisMitigationActions.vue';

import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import { osimRuntime } from '@/stores/osimRuntime';

defineProps<{
  aegisContext: AegisSuggestionContextRefs;
  error?: null | string;
}>();

const modelValue = defineModel<null | string | undefined>();
</script>

<template>
  <LabelTextarea
    v-model="modelValue"
    label="Mitigation"
    placeholder="Mitigation Text ..."
    :error="error"
  >
    <template v-if="osimRuntime.flags?.aiMitigationSuggestions" #label>
      <span class="form-label col-3 position-relative">
        <AegisMitigationActions v-model="modelValue" :aegisContext="aegisContext" />
        <span class="ms-2">Mitigation</span>
      </span>
    </template>
  </LabelTextarea>
</template>
