<script setup lang="ts">
import { computed } from 'vue';

import AegisActions from '@/components/AegisActions/AegisActions.vue';

import { useAegisSuggestCwe } from '@/composables/aegis/useAegisSuggestCwe';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

const props = withDefaults(defineProps<{
  aegisContext?: AegisSuggestionContextRefs | null;
}>(), {
  aegisContext: null,
});

const modelValue = defineModel<null | string>('modelValue', { default: null });

const {
  allSuggestions,
  canShowFeedback,
  canSuggest,
  currentSuggestion,
  details: suggestionDetails,
  hasAppliedSuggestion,
  hasMultipleSuggestions,
  isSuggesting,
  revert: revertCwe,
  selectedSuggestionIndex,
  selectSuggestion,
  sendFeedback,
  suggestCwe,
} = useAegisSuggestCwe({ valueRef: modelValue, context: props.aegisContext as AegisSuggestionContextRefs });

defineExpose({
  isSuggesting,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !suggestionDetails.value) return 'Suggest CWE via AEGIS-AI';
  const { confidence, explanation, tools_used } = suggestionDetails.value;
  const currentCwe = currentSuggestion.value;
  const parts: string[] = [`Value: ${currentCwe}`];
  if (hasMultipleSuggestions.value) {
    parts.push(`Suggestion ${selectedSuggestionIndex.value + 1} of ${allSuggestions.value.length}`);
  }
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
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedSuggestion"
    :hasMultipleSuggestions="hasMultipleSuggestions"
    :isSuggesting="isSuggesting"
    :canShowFeedback="canShowFeedback"
    :suggestions="allSuggestions"
    :selectedIndex="selectedSuggestionIndex"
    :tooltipText="suggestionTooltip"
    @suggest="suggestCwe"
    @selectSuggestion="selectSuggestion"
    @revert="revertCwe"
    @feedback="sendFeedback"
  >
    <template #suggestion-item="{ suggestions, selectedIndex, selectSuggestion: selectSuggestionFn }">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="dropdown-item px-2 py-1 cursor-pointer"
        :class="{ 'active': index === selectedIndex }"
        @click.prevent.stop="selectSuggestionFn(index)"
      >
        <span class="fs-7">{{ suggestion }}</span>
        <span v-if="index === selectedIndex" class="text-success">
          <i class="bi-check-square-fill fs-5"></i>
        </span>
      </div>
    </template>
  </AegisActions>
</template>

<style scoped lang="scss">
.dropdown-item {
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background-color: #f8f9fa;
  }

  &.active {
    background-color: #e7f3ff;
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
