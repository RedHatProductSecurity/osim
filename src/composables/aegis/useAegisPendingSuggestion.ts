import { computed, type Ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import type { AegisChangeEntry } from '@/types/aegisAI';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

/**
 * Accept and reject actions for an AI-Bot suggestion pending in aegis_meta.
 * The decision is recorded as the aegis_meta change itself: accepting appends
 * an 'AI-Bot' entry that supersedes the pending one (keeping the suggestion
 * auditable), rejecting removes the pending entry. Both are mirrored on the
 * flaw copy so the updated-state check flips and the save payload cannot
 * resurrect the pending entry when the tracking store holds no other AI changes.
 */
export function useAegisPendingSuggestion(
  fieldName: string,
  valueRef: Ref<null | string | string[] | undefined>,
) {
  const { flaw } = useFlaw();
  const { appendAegisChangeEntry, getPendingAIBotEntry, removePendingAIBotEntry } = useAegisMetadataTracking();

  const pendingEntry = computed(() => getPendingAIBotEntry(fieldName, valueRef.value));

  function mirrorAppendOnFlaw(entry: AegisChangeEntry) {
    const metadata = flaw.value.aegis_meta;
    if (!metadata) return;
    const entries = metadata[fieldName];
    // The tracking store shares entry arrays with the flaw copy when both were
    // loaded from the same fetch (setFlaw + setAegisMetadata), so appending to
    // the store has already updated the flaw copy.
    if (Array.isArray(entries) && entries.includes(entry)) return;
    metadata[fieldName] ||= [];
    metadata[fieldName].push(entry);
  }

  function mirrorRemovalOnFlaw() {
    const metadata = flaw.value.aegis_meta;
    if (!metadata) return;
    const entries = metadata[fieldName];
    if (!Array.isArray(entries) || !entries.length) return;
    if (entries[entries.length - 1]?.type !== 'AI-Bot-Pending') return;
    entries.pop();
    if (!entries.length) delete metadata[fieldName];
  }

  /** Applies the suggested value and records an 'AI-Bot' entry superseding the pending one. */
  function accept() {
    const entry = pendingEntry.value;
    if (!entry || entry.value == null) return;

    valueRef.value = entry.value;
    const acceptedEntry: AegisChangeEntry = {
      type: 'AI-Bot',
      timestamp: new Date().toISOString(),
      value: entry.value,
      explanation: entry.explanation,
      confidence: entry.confidence,
      data_quality: entry.data_quality,
      tools_used: entry.tools_used,
    };
    appendAegisChangeEntry(fieldName, acceptedEntry);
    mirrorAppendOnFlaw(acceptedEntry);
  }

  /** Removes the pending entry; the removal itself is the recorded decision. */
  function reject() {
    if (!pendingEntry.value) return;
    removePendingAIBotEntry(fieldName);
    mirrorRemovalOnFlaw();
  }

  return { accept, pendingEntry, reject };
}
