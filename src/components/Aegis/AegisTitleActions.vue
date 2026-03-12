<script setup lang="ts">
import { computed } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import type { UseAegisSuggestDescriptionReturn } from '@/composables/aegis/useAegisSuggestDescription';
import { useAegisFieldFeedback } from '@/composables/aegis/useAegisFieldFeedback';

import { osimRuntime } from '@/stores/osimRuntime';

const props = defineProps<{
  composable: UseAegisSuggestDescriptionReturn;
  titleValue?: null | string;
}>();

const {
  canShowTitleFeedback,
  canSuggest,
  details: suggestionDetails,
  hasAppliedTitleSuggestion,
  isSuggesting,
  revertTitle,
  sendTitleFeedback,
  suggestDescription,
} = props.composable;

defineExpose({
  isSuggesting,
});

const {
  canShowFeedbackExtended: canShowTitleFeedbackExtended,
  handleFieldFeedback: handleTitleFeedback,
  isFieldAIBot: isTitleAIBot,
} = useAegisFieldFeedback(
  'title',
  computed(() => props.titleValue),
  canShowTitleFeedback,
  hasAppliedTitleSuggestion,
  sendTitleFeedback,
);

const suggestionTooltip = computed(() => {
  if (!hasAppliedTitleSuggestion.value || !suggestionDetails.value) return 'Suggested by Aegis-AI';
  const { confidence, explanation, suggested_title, tools_used } = suggestionDetails.value;
  const parts: string[] = [];
  if (suggested_title) parts.push(`Value: ${suggested_title}`);
  if (confidence != null && confidence !== '') parts.push(`Confidence: ${confidence}`);
  if (explanation) parts.push(`Explanation: ${explanation}`);
  if (tools_used && tools_used.length > 0) {
    parts.push(`Tools Used: ${tools_used.join(', ')}`);
  }
  return parts.join('\n');
});
</script>

<template>
  <AegisActions
    v-if="osimRuntime.flags?.aiTitleSuggestions === true || isTitleAIBot"
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedTitleSuggestion"
    :hasMultipleSuggestions="false"
    :isFetchingSuggestion="isSuggesting"
    :canShowFeedback="canShowTitleFeedbackExtended"
    :suggestions="[]"
    :selectedIndex="0"
    :tooltipText="suggestionTooltip"
    @suggest="suggestDescription"
    @revert="revertTitle"
    @feedback="handleTitleFeedback"
  />
</template>
