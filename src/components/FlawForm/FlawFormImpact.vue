<script setup lang="ts">
import { computed } from 'vue';

import Nudge from '@/components/Nudge/Nudge.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

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

const {
  // canShowFeedback,
  // canSuggest,
  // details: suggestionDetails,
  // hasAppliedSuggestion,
  isFetching,
  // revert: revertCwe,
  // sendFeedback,
  suggestImpact,
} = useAegisSuggestion(
  props.aegisContext as AegisSuggestionContextRefs,
  modelValue,
  'impact',
);

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
    <template #nudge>
      <Nudge
        v-if="shouldShowImpactNudge"
        tooltip="Ensure that you have left a comment justifying the impact change."
      />
    </template>
  </LabelSelect>
</template>
