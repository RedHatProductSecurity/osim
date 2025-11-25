<script setup lang="ts">
import { type Ref, computed } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import { osimRuntime } from '@/stores/osimRuntime';

const props = withDefaults(defineProps<{
  aegisContext?: AegisSuggestionContextRefs | null;
}>(), {
  aegisContext: null,
});

const modelValue = defineModel<null | string>('modelValue');

const {
  allSuggestions,
  canShowFeedback,
  canSuggest,
  currentSuggestion,
  details: statementSuggestionDetails,
  hasAppliedSuggestion,
  hasMultipleSuggestions,
  isFetchingSuggestion,
  revert: revertStatement,
  selectedSuggestionIndex,
  selectSuggestion,
  sendFeedback,
  suggestStatement,
} = useAegisSuggestion(
  props.aegisContext as AegisSuggestionContextRefs,
  modelValue as Ref<null | string>,
  'statement',
);

defineExpose({
  isFetchingSuggestion,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !statementSuggestionDetails.value) return 'Suggest Statement via AEGIS-AI';
  const { confidence, explanation, tools_used } = statementSuggestionDetails.value;
  const currentStatementSuggestion = currentSuggestion.value;
  const parts: string[] = [`Value: ${currentStatementSuggestion}`];
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
    v-if="osimRuntime.flags?.aiStatementSuggestions"
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedSuggestion"
    :hasMultipleSuggestions="hasMultipleSuggestions"
    :isFetchingSuggestion="isFetchingSuggestion"
    :canShowFeedback="canShowFeedback"
    :suggestions="allSuggestions as string[]"
    :selectedIndex="selectedSuggestionIndex"
    :tooltipText="suggestionTooltip"
    @suggest="suggestStatement"
    @selectSuggestion="selectSuggestion"
    @revert="revertStatement"
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
