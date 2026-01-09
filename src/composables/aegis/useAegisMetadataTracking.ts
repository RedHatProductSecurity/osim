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
