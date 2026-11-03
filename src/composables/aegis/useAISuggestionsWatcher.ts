import { onScopeDispose, ref, readonly, watch, type Ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

const isValueEqual = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return a === b;
};

export function useAISuggestionsWatcher(fieldName: string, valueRef: Ref<null | string | string[] | undefined>) {
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();
  const { flawResyncCount } = useFlaw();

  const hasAppliedSuggestion = ref(false);
  const originalSuggestion = ref<null | string | string[]>(null);
  const originalFieldValue = ref<null | string | string[] | undefined>(null);
  const hasPartialModification = ref(false);
  const hasTrackedPartialChange = ref(false);
  // Requests outlive the component that started them. Once the owning scope
  // is gone (the form was remounted for another flaw), a late response must
  // not be written into whichever flaw model is current.
  let disposed = false;
  onScopeDispose(() => { disposed = true; });

  // Value changes caused by a flaw model resync are not user modifications;
  // remember the resync count seen by the last partial-modification check.
  let resyncCountAtLastChange = flawResyncCount.value;
  watch(valueRef, (newValue, oldValue) => {
    const resynced = flawResyncCount.value !== resyncCountAtLastChange;
    resyncCountAtLastChange = flawResyncCount.value;
    if (resynced) return;
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

  // A same-flaw resync (post-save sync, refetch) replaces the flaw model and
  // with it values that were only applied locally. When a previously applied
  // suggestion was wiped back to its pre-suggestion value, restore it rather
  // than losing it. Server-side changes (a value differing from the baseline)
  // and fields the user modified since the suggestion are left alone, and the
  // suggestion metadata is not re-tracked.
  watch(flawResyncCount, () => {
    if (!hasAppliedSuggestion.value) return;
    if (hasPartialModification.value) return;
    if (!isValueEqual(valueRef.value, originalFieldValue.value)) return;
    valueRef.value = Array.isArray(originalSuggestion.value)
      ? [...originalSuggestion.value]
      : originalSuggestion.value;
    hasPartialModification.value = false;
    hasTrackedPartialChange.value = false;
  });

  const applyAISuggestion = (suggestion: string | string[]): boolean => {
    if (disposed) return false;
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
    return true;
  };

  const revertAISuggestion = () => {
    if (disposed) return;
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
