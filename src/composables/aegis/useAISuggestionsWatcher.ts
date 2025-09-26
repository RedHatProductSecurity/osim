import { ref, watch, readonly, type Ref } from 'vue';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

export function useAISuggestionsWatcher(fieldName: string, valueRef: Ref<null | string>) {
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();

  const hasAppliedSuggestion = ref(false);
  const originalSuggestion = ref<null | string>(null);

  const applyAISuggestion = (suggestion: string) => {
    hasAppliedSuggestion.value = true;
    originalSuggestion.value = suggestion;
    valueRef.value = suggestion; // This will trigger the watcher to track the change
  };

  const revertAISuggestion = () => {
    untrackAIChange(fieldName);
    hasAppliedSuggestion.value = false;
    originalSuggestion.value = null;
  };

  // Watch for user modifications to AI suggestions
  const stopWatcher = watch(
    () => valueRef.value,
    (newValue) => {
      if (hasAppliedSuggestion.value && originalSuggestion.value && newValue) {
        if (originalSuggestion.value === newValue) {
          // User kept the original suggestion unchanged
          trackAIChange(fieldName, 'AI', newValue);
        } else {
          // User modified the suggestion in any way
          trackAIChange(fieldName, 'Partial AI', newValue);
        }
      }
    },
    { immediate: false },
  );

  return {
    hasAppliedSuggestion: readonly(hasAppliedSuggestion),
    applyAISuggestion,
    revertAISuggestion,
    stopWatcher,
  };
}
