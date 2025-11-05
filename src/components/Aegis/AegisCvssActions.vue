<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

const props = withDefaults(defineProps<{
  aegisContext?: AegisSuggestionContextRefs | null;
}>(), {
  aegisContext: null,
});

const emit = defineEmits<{ 'update:cvssVector': [vector: null | string] }>();
const emitUpdateCvssVector = (vector: null | string) => emit('update:cvssVector', vector);

const suggestedCvssVector = ref<null | string>(null);
watch(suggestedCvssVector, emitUpdateCvssVector);

const {
  allSuggestions,
  canShowFeedback,
  canSuggest,
  currentSuggestion,
  details: suggestionDetails,
  hasAppliedSuggestion,
  hasMultipleSuggestions,
  isFetchingSuggestion,
  revert: revertCvss,
  selectedSuggestionIndex,
  selectSuggestion,
  sendFeedback,
  suggestCvss,
} = useAegisSuggestion(props.aegisContext as AegisSuggestionContextRefs, suggestedCvssVector, '_cvss3_vector');

defineExpose({
  isFetchingSuggestion,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !suggestionDetails.value) return 'Suggest CVSS via AEGIS-AI';
  const { confidence, explanation, tools_used } = suggestionDetails.value;
  const currentCVSS = currentSuggestion.value;
  const parts: string[] = [`Value: ${currentCVSS}`];
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
    @suggest="suggestCvss"
    @selectSuggestion="selectSuggestion"
    @revert="revertCvss"
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
