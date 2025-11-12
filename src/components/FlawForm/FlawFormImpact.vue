<script setup lang="ts">
import { computed } from 'vue';

import Nudge from '@/components/Nudge/Nudge.vue';
import AegisImpactActions from '@/components/Aegis/AegisImpactActions.vue';

import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import { osimRuntime } from '@/stores/osimRuntime';
import { flawImpactEnum } from '@/types/zodFlaw';
import { FlawClassificationStateEnum } from '@/generated-client';
import { ImpactEnumWithBlank } from '@/types/zodShared';
import LabelSelect from '@/widgets/LabelSelect/LabelSelect.vue';
import type { ValueOf } from '@/types';

type ImpactEnumWithBlankType = ValueOf<typeof ImpactEnumWithBlank>;

const props = defineProps<{
  aegisContext: AegisSuggestionContextRefs;
  error: null | string;
  initialImpact: ImpactEnumWithBlankType | null;
  workflowState: FlawClassificationStateEnum;
}>();

const modelValue = defineModel<ImpactEnumWithBlankType | null | undefined>('modelValue');

function handleImpactChange(value: null | string | undefined) {
  modelValue.value = value as ImpactEnumWithBlankType | null | undefined;
}

const shouldShowImpactNudge = computed(() => {
  const postTriageStates: FlawClassificationStateEnum[] = [
    FlawClassificationStateEnum.Rejected,
    FlawClassificationStateEnum.PreSecondaryAssessment,
    FlawClassificationStateEnum.SecondaryAssessment,
    FlawClassificationStateEnum.Done,
  ];
  const hasBeenTriaged = props.workflowState && postTriageStates.includes(props.workflowState);
  const didImpactChange = modelValue.value !== props.initialImpact;
  return hasBeenTriaged && didImpactChange;
});
</script>

<template>
  <LabelSelect
    v-model="modelValue as string"
    label="Impact"
    :options="flawImpactEnum"
    :error="error"
    :withBlank="true"
  >
    <template #label="{ label }">
      <AegisImpactActions
        v-if="osimRuntime.flags?.aiImpactSuggestions === true"
        :aegisContext="aegisContext"
        :modelValue="modelValue"
        @update:impact="handleImpactChange"
      />
      {{ label }}
      <Nudge
        v-if="shouldShowImpactNudge"
        tooltip="Ensure that you have left a comment justifying the impact change."
      />
    </template>
  </LabelSelect>
</template>

<style lang="css" scoped>
.label-icon {
  color: gray;
  margin-right: 0.5rem;
  cursor: pointer;
}

.label-icon.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.label-icon.applied {
  color: black;
}

.throbber {
  position: absolute;
  left: 1rem;
}
</style>
