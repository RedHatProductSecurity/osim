<script setup lang="ts">
import { computed, type Ref } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

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
  details: suggestionDetails,
  hasAppliedSuggestion,
  hasMultipleSuggestions,
  isFetchingSuggestion,
  revert: revertMitigation,
  selectedSuggestionIndex,
  selectSuggestion,
  sendFeedback,
  suggestMitigation,
} = useAegisSuggestion(
  props.aegisContext as AegisSuggestionContextRefs,
  modelValue as Ref<null | string>,
  'mitigation',
);

defineExpose({
  isFetchingSuggestion,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !suggestionDetails.value) return 'Suggest Mitigation via AEGIS-AI';
  const { confidence, explanation, tools_used } = suggestionDetails.value;
  const parts: string[] = [];
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
    :suggestions="allSuggestions"
    :selectedIndex="selectedSuggestionIndex"
    :tooltipText="suggestionTooltip"
    @suggest="suggestMitigation"
    @selectSuggestion="selectSuggestion"
    @revert="revertMitigation"
    @feedback="sendFeedback"
  >
    <template #suggestion-item="{ suggestions, selectedIndex, selectSuggestion: selectSuggestionFn }">
      <li v-for="(suggestion, index) in suggestions" :key="index">
        <button
          class="dropdown-item"
          :class="{ 'active': index === selectedIndex }"
          type="button"
          @click="selectSuggestionFn(index)"
        >
          <div class="flex-grow-1 d-flex flex-column" style="gap: 0.15rem;">
            <span class="fw-bold fs-7">{{ suggestion }}</span>

          </div>
        </button>
      </li>
    </template>
  </AegisActions>
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
