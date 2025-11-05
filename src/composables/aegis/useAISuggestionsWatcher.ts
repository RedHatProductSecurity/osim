import { ref, readonly, watch, type Ref } from 'vue';

import type { SuggestableFlawFields } from '@/types/aegisAI';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

export function useAISuggestionsWatcher(fieldName: SuggestableFlawFields, valueRef: Ref<null | string>) {
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();

  const hasAppliedSuggestion = ref(false);
  const originalSuggestion = ref<null | string>(null);

  // Watch for manual changes after AI suggestion has been applied
  watch(valueRef, (newValue, oldValue) => {
    if (hasAppliedSuggestion.value && newValue !== originalSuggestion.value && newValue !== oldValue) {
      trackAIChange(fieldName, 'Partial AI', newValue || undefined);
    }
  });

  const applyAISuggestion = (suggestion: string) => {
    hasAppliedSuggestion.value = true;
    originalSuggestion.value = suggestion;
    valueRef.value = suggestion;
    trackAIChange(fieldName, 'AI', suggestion);
  };

  const revertAISuggestion = () => {
    untrackAIChange(fieldName);
    hasAppliedSuggestion.value = false;
    originalSuggestion.value = null;
  };

  return {
    hasAppliedSuggestion: readonly(hasAppliedSuggestion),
    applyAISuggestion,
    revertAISuggestion,
  };
}
