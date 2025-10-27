<script setup lang="ts">
import { computed } from 'vue';

import Nudge from '@/components/Nudge/Nudge.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
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

const {
  canShowFeedback,
  // canSuggest,
  details: impactSuggestionDetails,
  hasAppliedSuggestion,
  isFetching,
  revert: revertImpact,
  sendFeedback,
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
    <template #label="{ label }">
      <span v-if="isFetching" v-osim-loading.grow="isFetching" class="throbber" />
      <i
        v-if="osimRuntime.flags?.aiCweSuggestions === true"
        class="bi-stars label-icon"
        :class="{ applied: hasAppliedSuggestion }"
        :title="impactSuggestionDetails?.explanation"
        @click.prevent.stop="suggestImpact"
      />
      <span v-if="canShowFeedback" class="ms-2">
        <i
          class="bi-arrow-counterclockwise label-icon"
          title="Revert Impact suggestion"
          @click.prevent.stop="revertImpact"
        />
        <i
          class="bi-hand-thumbs-up label-icon"
          title="Mark suggestion helpful"
          @click.prevent.stop="sendFeedback('up')"
        />
        <i
          class="bi-hand-thumbs-down label-icon"
          title="Mark suggestion unhelpful"
          @click.prevent.stop="sendFeedback('down')"
        />
      </span>
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
