<script setup lang="ts">
import AegisMitigationActions from '@/components/Aegis/AegisMitigationActions.vue';

import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import { osimRuntime } from '@/stores/osimRuntime';

defineProps<{
  aegisContext: AegisSuggestionContextRefs;
  error?: null | string;
}>();

const modelValue = defineModel<null | string | undefined>();

const { isFieldValueAIBot } = useAegisMetadataTracking();
</script>

<template>
  <LabelTextarea
    v-model="modelValue"
    label="Mitigation"
    placeholder="Mitigation Text ..."
    :error="error"
  >
    <template #label>
      <span
        class="form-label col-3 position-relative d-flex align-items-center"
        :class="{
          'border-start border-primary border-3 bg-primary bg-opacity-10 ps-2':
            isFieldValueAIBot('mitigation', modelValue)
        }"
      >
        <i
          v-if="isFieldValueAIBot('mitigation', modelValue)"
          class="bi bi-robot text-primary me-1"
        ></i>
        <AegisMitigationActions
          v-if="osimRuntime.flags?.aiMitigationSuggestions"
          v-model="modelValue"
          :aegisContext="aegisContext"
        />
        <span>Mitigation</span>
      </span>
    </template>
  </LabelTextarea>
</template>
