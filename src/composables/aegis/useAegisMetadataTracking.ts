import { ref } from 'vue';

import { useFlaw } from '@/composables/useFlaw';

import type { ZodFlawHistoryItemType, AegisChangeType } from '../../types/zodFlaw';
import type { AegisChangeEntry, AegisMetadata } from '../../types/aegisAI';

const aegisMetadata = ref<AegisMetadata>({});

function trackAIChange(fieldName: string, changeType: AegisChangeType, value?: string) {
  aegisMetadata.value[fieldName] ||= [];
  aegisMetadata.value[fieldName].push({
    type: changeType,
    timestamp: new Date().toISOString(),
    value,
  });
}

/**
 * Removes all AI tracking entries for a field.
 *
 * IMPORTANT: This should NOT be called when transitioning from "AI" to "Partial AI".
 * The "AI" entry must be preserved so that programmatic feedback can always find
 * the original AI suggestion value. Only call this when completely reverting/removing
 * AI tracking for a field (e.g., when user reverts the suggestion).
 */
function untrackAIChange(fieldName: string) {
  delete aegisMetadata.value[fieldName];
}

function getAegisMetadata(): AegisMetadata {
  return { ...aegisMetadata.value };
}

function setAegisMetadata(metadata: AegisMetadata | null | undefined) {
  aegisMetadata.value = metadata ? { ...metadata } : {};
}

function hasAegisChanges(): boolean {
  return Object.keys(aegisMetadata.value).length > 0;
}

function getFieldAegisTypeFromHistory(
  fieldMetadata: AegisChangeEntry[]): AegisChangeType | null {
  if (!Array.isArray(fieldMetadata) || fieldMetadata.length === 0) return null;

  // Return the most recent aegis change type for this field
  // The presence of the field in aegis_meta for this history entry indicates it was AI-assisted
  const lastEntry = fieldMetadata[fieldMetadata.length - 1];
  return lastEntry?.type ?? null;
}

function getFieldAegisType(historyEntry: ZodFlawHistoryItemType, fieldName: string): null | string {
  if (!historyEntry.pgh_diff || fieldName === 'aegis_meta') return null;

  const aegisHistoryChanges = historyEntry.pgh_diff.aegis_meta;
  if (aegisHistoryChanges && Array.isArray(aegisHistoryChanges) && aegisHistoryChanges.length >= 2) {
    const newAegisMetaValue = aegisHistoryChanges[1];
    if (newAegisMetaValue && typeof newAegisMetaValue === 'object') {
      const fieldMetadata = newAegisMetaValue[fieldName];
      return getFieldAegisTypeFromHistory(fieldMetadata);
    }
  }

  return null;
}

function isFieldAegisChange(historyEntry: ZodFlawHistoryItemType, fieldName: string): boolean {
  return !!getFieldAegisType(historyEntry, fieldName);
}

function isFieldValueAIBot(fieldName: string, currentValue: null | string | string[] | undefined): boolean {
  const metadata = aegisMetadata.value[fieldName];
  if (!metadata?.length) return false;

  // Only show highlighting if flaw is in NEW/empty state
  const { flaw } = useFlaw();
  if (flaw.value.classification?.state !== 'NEW' && flaw.value.classification?.state !== '') return false;

  // Check if the most recent entry that matches the current value is AI-Bot type
  const matchingEntries = metadata.filter((entry) => {
    // For array fields, compare arrays directly
    if (Array.isArray(currentValue) && Array.isArray(entry.value)) {
      return JSON.stringify(currentValue) === JSON.stringify(entry.value);
    }

    // For string fields, compare strings directly
    return entry.value === currentValue;
  });

  if (matchingEntries.length === 0) return false;

  // Get the most recent matching entry and check if it's AI-Bot type
  const mostRecentEntry = matchingEntries.pop();
  return mostRecentEntry?.type === 'AI-Bot';
}

function hasAIBotProcessing(aegisMetadata: AegisMetadata): boolean {
  if (!aegisMetadata) {
    return false;
  }

  for (const metadata of Object.values(aegisMetadata)) {
    if (Array.isArray(metadata) && metadata.length > 0) {
      const lastEntry = metadata[metadata.length - 1];
      if (lastEntry.type === 'AI-Bot') {
        return true;
      }
    }
  }

  return false;
}

export function useAegisMetadataTracking() {
  return {
    trackAIChange,
    untrackAIChange,
    getAegisMetadata,
    setAegisMetadata,
    hasAegisChanges,
    getFieldAegisType,
    isFieldAegisChange,
    isFieldValueAIBot,
    hasAIBotProcessing,
  };
}
