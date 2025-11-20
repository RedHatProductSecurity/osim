<script setup lang="ts">
import { computed } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import type { UseAegisSuggestDescriptionReturn } from '@/composables/aegis/useAegisSuggestDescription';

import { osimRuntime } from '@/stores/osimRuntime';

const props = defineProps<{
  composable: UseAegisSuggestDescriptionReturn;
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

const suggestionTooltip = computed(() => {
  if (!hasAppliedTitleSuggestion.value || !suggestionDetails.value) return 'Suggest Title via AEGIS-AI';
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
    v-if="osimRuntime.flags?.aiTitleSuggestions === true"
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedTitleSuggestion"
    :hasMultipleSuggestions="false"
    :isFetchingSuggestion="isSuggesting"
    :canShowFeedback="canShowTitleFeedback"
    :suggestions="[]"
    :selectedIndex="0"
    :tooltipText="suggestionTooltip"
    @suggest="suggestDescription"
    @revert="revertTitle"
    @feedback="sendTitleFeedback"
  />
</template>
