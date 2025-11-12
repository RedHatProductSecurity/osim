<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

import AegisActions from '@/components/Aegis/AegisActions.vue';

import { useAegisSuggestion } from '@/composables/aegis/useAegisSuggestion';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import { osimRuntime } from '@/stores/osimRuntime';
import { loadCweData } from '@/services/CweService';
import type { CWEMemberType } from '@/types/mitreCwe';

const props = withDefaults(defineProps<{
  aegisContext?: AegisSuggestionContextRefs | null;
  cweData?: CWEMemberType[];
}>(), {
  aegisContext: null,
  cweData: () => [],
});

const modelValue = defineModel<null | string>('modelValue', { default: null });

const cweDataRef = ref<CWEMemberType[]>([]);

const {
  allSuggestions,
  canShowFeedback,
  canSuggest,
  currentSuggestion,
  details: suggestionDetails,
  hasAppliedSuggestion,
  hasMultipleSuggestions,
  isFetchingSuggestion,
  revert: revertCwe,
  selectedSuggestionIndex,
  selectSuggestion,
  sendFeedback,
  suggestCwe,
} = useAegisSuggestion(props.aegisContext as AegisSuggestionContextRefs, modelValue, 'cwe_id');

defineExpose({
  isFetchingSuggestion,
});

const suggestionTooltip = computed(() => {
  if (!hasAppliedSuggestion.value || !suggestionDetails.value) return 'Suggest CWE via AEGIS-AI';
  const { confidence, explanation, tools_used } = suggestionDetails.value;
  const currentCwe = currentSuggestion.value;

  const cweDetails = currentCwe ? getCweDetails(currentCwe) : null;
  const valueWithTitle = cweDetails?.name ? `${currentCwe} ${cweDetails.name}` : currentCwe;

  const parts: string[] = [`Value: ${valueWithTitle}`];

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

function getCweDetails(cweId: string): CWEMemberType | null {
  const id = cweId.replace('CWE-', '');
  return cweDataRef.value.find(cwe => cwe.id === id) || null;
}

onMounted(() => {
  // Use provided cweData prop if available, otherwise load from localStorage
  cweDataRef.value = props.cweData.length > 0
    ? props.cweData
    : loadCweData().filter(({ isProhibited }) => !isProhibited);
});
</script>

<template>
  <AegisActions
    v-if="osimRuntime.flags?.aiCweSuggestions === true"
    :canSuggest="canSuggest"
    :hasAppliedSuggestion="hasAppliedSuggestion"
    :hasMultipleSuggestions="hasMultipleSuggestions"
    :isFetchingSuggestion="isFetchingSuggestion"
    :canShowFeedback="canShowFeedback"
    :suggestions="allSuggestions as string[]"
    :selectedIndex="selectedSuggestionIndex"
    :tooltipText="suggestionTooltip"
    @suggest="suggestCwe"
    @selectSuggestion="selectSuggestion"
    @revert="revertCwe"
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
            <small v-if="getCweDetails(suggestion)" class="text-muted small">
              {{ getCweDetails(suggestion)!.name }}
            </small>
          </div>
          <a
            v-if="getCweDetails(suggestion)"
            :href="`https://cwe.mitre.org/data/definitions/${getCweDetails(suggestion)!.id}.html`"
            class="icon-link"
            target="_blank"
            @click.stop
          >
            <i class="bi-box-arrow-up-right" title="View on Mitre" />
          </a>
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
