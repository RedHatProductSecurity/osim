<script setup lang="ts">
import { type Ref, computed, watch } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import type { ImpactEnumWithBlankType } from '@/types/zodShared';

const props = withDefaults(defineProps<{
  aegisContext?: AegisSuggestionContextRefs | null;
}>(), {
  aegisContext: null,
});

const modelValue = defineModel<null | string>('modelValue');

const emit = defineEmits<{
  (e: 'update:impact', value: null | string | undefined): void;
}>();

watch(modelValue, (newValue) => {
  emit('update:impact', newValue);
});

const {
  allSuggestions,
  canShowFeedback,
  canSuggest,
  currentSuggestion,
  details: impactSuggestionDetails,
  hasAppliedSuggestion,
  hasMultipleSuggestions,
  isFetchingSuggestion,
  revert: revertImpact,
  selectedSuggestionIndex,
  selectSuggestion,
  sendFeedback,
  suggestImpact,
} = useAegisSuggestion(
  props.aegisContext as AegisSuggestionContextRefs,
  modelValue as Ref<ImpactEnumWithBlankType | null | string>,
  'impact',
);

defineExpose({
  isFetchingSuggestion,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !impactSuggestionDetails.value) return 'Suggest Impact via AEGIS-AI';
  const { confidence, explanation, tools_used } = impactSuggestionDetails.value;
  const currentImpact = currentSuggestion.value;
  const parts: string[] = [`Value: ${currentImpact}`];
  if (hasMultipleSuggestions.value) {
    parts.push(`Suggestion ${selectedSuggestionIndex.value + 1} of ${allSuggestions.value.length}`);
  }
  if (confidence != null) parts.push(`Confidence: ${confidence}`);
  if (explanation) parts.push(`Explanation: ${explanation}`);
  if (tools_used && tools_used.length > 0) {
    parts.push(`Tools Used: ${tools_used.join(', ')}`);
  }
  return parts.join('\n');
});
</script>

<template>
  <AegisActions
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedSuggestion"
    :hasMultipleSuggestions="hasMultipleSuggestions"
    :isFetchingSuggestion="isFetchingSuggestion"
    :canShowFeedback="canShowFeedback"
    :suggestions="allSuggestions as string[]"
    :selectedIndex="selectedSuggestionIndex"
    :tooltipText="suggestionTooltip"
    @suggest="suggestImpact"
    @selectSuggestion="selectSuggestion"
    @revert="revertImpact"
    @feedback="sendFeedback"
  />
</template>

<style scoped lang="scss">
.icon-link {
  color: gray;
  text-decoration: none;

  &:hover {
    color: #0d6efd;
  }
}
</style>
