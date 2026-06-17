import { ref, readonly, watch, type Ref } from 'vue';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

const isValueEqual = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return a === b;
};

export function useAISuggestionsWatcher(fieldName: string, valueRef: Ref<null | string | string[] | undefined>) {
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();

  const hasAppliedSuggestion = ref(false);
  const originalSuggestion = ref<null | string | string[]>(null);
  const originalFieldValue = ref<null | string | string[] | undefined>(null);
  const hasPartialModification = ref(false);
  const hasTrackedPartialChange = ref(false);

  watch(valueRef, (newValue, oldValue) => {
    if (hasAppliedSuggestion.value
      && !isValueEqual(newValue, originalSuggestion.value)
      && !isValueEqual(newValue, oldValue)) {
      hasPartialModification.value = true;
      if (!hasTrackedPartialChange.value) {
        const metadataValue = Array.isArray(newValue) ? JSON.stringify(newValue) : (newValue || undefined);
        trackAIChange(fieldName, 'Partial AI', metadataValue);
        hasTrackedPartialChange.value = true;
      }
    }
  });

  const applyAISuggestion = (suggestion: string | string[]) => {
    if (!hasAppliedSuggestion.value) {
      originalFieldValue.value = Array.isArray(valueRef.value) ? [...valueRef.value] : valueRef.value;
    }
    hasAppliedSuggestion.value = true;
    // Store copies for arrays to prevent reference issues
    originalSuggestion.value = Array.isArray(suggestion) ? [...suggestion] : suggestion;
    valueRef.value = Array.isArray(suggestion) ? [...suggestion] : suggestion;
    hasPartialModification.value = false;
    hasTrackedPartialChange.value = false;

    // For arrays, serialize for metadata storage
    const metadataValue = Array.isArray(suggestion) ? JSON.stringify(suggestion) : suggestion;
    trackAIChange(fieldName, 'AI', metadataValue);
  };

  const revertAISuggestion = () => {
    // Restore using copy for arrays
    valueRef.value = Array.isArray(originalFieldValue.value)
      ? [...originalFieldValue.value]
      : originalFieldValue.value;
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
    originalSuggestion: readonly(originalSuggestion),
    applyAISuggestion,
    revertAISuggestion,
  };
}
