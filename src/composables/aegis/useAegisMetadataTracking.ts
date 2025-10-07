import { ref } from 'vue';

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

function findMatchingAegisMetadataEntry(fieldMetadata: AegisChangeEntry[], historyTimestamp: Date) {
  // Find the closest aegis metadata entry by timestamp
  let closestEntry = null;
  let smallestDiff = Infinity;

  for (const entry of fieldMetadata) {
    const entryTimestamp = new Date(entry.timestamp);
    const timeDiff = Math.abs(entryTimestamp.getTime() - historyTimestamp.getTime());

    if (timeDiff < 15000 && timeDiff < smallestDiff) { // Within 15 second tolerance
      smallestDiff = timeDiff;
      closestEntry = entry;
    }
  }

  return closestEntry;
}

function getFieldAegisTypeFromHistory(
  fieldMetadata: AegisChangeEntry[],
  historyTimestamp: string): AegisChangeType | null {
  if (!Array.isArray(fieldMetadata) || fieldMetadata.length === 0) return null;

  const timestamp = new Date(historyTimestamp);
  const matchingEntry = findMatchingAegisMetadataEntry(fieldMetadata, timestamp);

  return matchingEntry ? matchingEntry.type : null;
}

function getFieldAegisType(historyEntry: ZodFlawHistoryItemType, fieldName: string): null | string {
  if (!historyEntry.pgh_diff || fieldName === 'aegis_meta') return null;

  const aegisHistoryChanges = historyEntry.pgh_diff.aegis_meta;
  if (aegisHistoryChanges && Array.isArray(aegisHistoryChanges) && aegisHistoryChanges.length >= 2) {
    const newAegisMetaValue = aegisHistoryChanges[1];
    if (newAegisMetaValue && typeof newAegisMetaValue === 'object') {
      const fieldMetadata = newAegisMetaValue[fieldName];
      return getFieldAegisTypeFromHistory(fieldMetadata, historyEntry.pgh_created_at || '');
    }
  }

  return null;
}

function isFieldAegisChange(historyEntry: ZodFlawHistoryItemType, fieldName: string): boolean {
  return !!getFieldAegisType(historyEntry, fieldName);
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
  };
}
