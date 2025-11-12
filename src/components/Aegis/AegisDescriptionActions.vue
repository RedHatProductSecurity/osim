<script setup lang="ts">
import { computed } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import type { UseAegisSuggestDescriptionReturn } from '@/composables/aegis/useAegisSuggestDescription';

import { osimRuntime } from '@/stores/osimRuntime';

const props = defineProps<{
  composable: UseAegisSuggestDescriptionReturn;
}>();

const {
  canShowDescriptionFeedback,
  canSuggest,
  details: suggestionDetails,
  hasAppliedDescriptionSuggestion,
  isSuggesting,
  revertDescription,
  sendDescriptionFeedback,
  suggestDescription,
} = props.composable;

defineExpose({
  isSuggesting,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedDescriptionSuggestion.value || !suggestionDetails.value) {
    return 'Suggest Description via AEGIS-AI';
  }
  const { confidence, description, explanation, tools_used } = suggestionDetails.value;
  const parts: string[] = [];
  if (description) parts.push(`Value: ${description.substring(0, 100)}...`);
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
    v-if="osimRuntime.flags?.aiDescriptionSuggestions === true"
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedDescriptionSuggestion"
    :hasMultipleSuggestions="false"
    :isFetchingSuggestion="isSuggesting"
    :canShowFeedback="canShowDescriptionFeedback"
    :suggestions="[]"
    :selectedIndex="0"
    :tooltipText="suggestionTooltip"
    @suggest="suggestDescription"
    @revert="revertDescription"
    @feedback="sendDescriptionFeedback"
  />
</template>
