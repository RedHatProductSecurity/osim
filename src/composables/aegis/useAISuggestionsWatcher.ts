import { ref, readonly, watch, type Ref } from 'vue';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

export function useAISuggestionsWatcher(fieldName: string, valueRef: Ref<null | string | undefined>) {
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();

  const hasAppliedSuggestion = ref(false);
  const originalSuggestion = ref<null | string>(null);
  const originalFieldValue = ref<null | string | undefined>(null);
  const hasPartialModification = ref(false);
  const hasTrackedPartialChange = ref(false);

  watch(valueRef, (newValue, oldValue) => {
    if (hasAppliedSuggestion.value && newValue !== originalSuggestion.value && newValue !== oldValue) {
      hasPartialModification.value = true;
      if (!hasTrackedPartialChange.value) {
        trackAIChange(fieldName, 'Partial AI', newValue || undefined);
        hasTrackedPartialChange.value = true;
      }
    }
  });

  const applyAISuggestion = (suggestion: string) => {
    if (!hasAppliedSuggestion.value) {
      originalFieldValue.value = valueRef.value;
    }
    hasAppliedSuggestion.value = true;
    originalSuggestion.value = suggestion;
    valueRef.value = suggestion;
    hasPartialModification.value = false;
    hasTrackedPartialChange.value = false;
    trackAIChange(fieldName, 'AI', suggestion);
  };

  const revertAISuggestion = () => {
    valueRef.value = originalFieldValue.value;
    untrackAIChange(fieldName);
    hasAppliedSuggestion.value = false;
    originalSuggestion.value = null;
    originalFieldValue.value = null;
    hasPartialModification.value = false;
    hasTrackedPartialChange.value = false;
  };

  return {
    hasAppliedSuggestion: readonly(hasAppliedSuggestion),
    hasPartialModification: readonly(hasPartialModification),
    applyAISuggestion,
    revertAISuggestion,
  };
}
