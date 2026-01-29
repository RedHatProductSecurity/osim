import { ref, readonly, watch, type Ref } from 'vue';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

export function useAISuggestionsWatcher(fieldName: string, valueRef: Ref<null | string | undefined>) {
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();

  const hasAppliedSuggestion = ref(false);
  const originalSuggestion = ref<null | string>(null);
  const hasPartialModification = ref(false);
  const hasTrackedPartialChange = ref(false);

  // Watch for changes and mark as "Partial AI" only if AI was applied in current session
  watch(valueRef, (newValue, oldValue) => {
    if (hasAppliedSuggestion.value && newValue !== originalSuggestion.value && newValue !== oldValue) {
      hasPartialModification.value = true;

      // Add Partial AI entry while preserving the original AI entry
      // This allows us to track both the original suggestion and the modified value
      if (!hasTrackedPartialChange.value) {
        trackAIChange(fieldName, 'Partial AI', newValue || undefined);
        hasTrackedPartialChange.value = true;
      }
    }
  });

  const applyAISuggestion = (suggestion: string) => {
    hasAppliedSuggestion.value = true;
    originalSuggestion.value = suggestion;
    valueRef.value = suggestion;
    hasPartialModification.value = false;
    hasTrackedPartialChange.value = false; // Reset tracking flag
    trackAIChange(fieldName, 'AI', suggestion);
  };

  const revertAISuggestion = () => {
    untrackAIChange(fieldName);
    hasAppliedSuggestion.value = false;
    originalSuggestion.value = null;
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
