import { ref } from 'vue';

export type AegisChangeType = 'AI' | 'Partial AI';

export type AegisChangeEntry = {
  historyId?: string;
  timestamp: string;
  type: AegisChangeType;
  value?: string;
};

export type AegisMetadata = {
  [fieldName: string]: AegisChangeEntry[];
};

const aegisMetadata = ref<AegisMetadata>({});

function trackAIChange(fieldName: string, changeType: AegisChangeType, value?: string, historyId?: string) {
  if (!aegisMetadata.value[fieldName]) {
    aegisMetadata.value[fieldName] = [];
  }
  aegisMetadata.value[fieldName].push({
    type: changeType,
    timestamp: new Date().toISOString(),
    value,
    historyId,
  });
}

function untrackAIChange(fieldName: string) {
  delete aegisMetadata.value[fieldName];
}

function getAIChangeType(fieldName: string): AegisChangeType | undefined {
  const changes = aegisMetadata.value[fieldName];
  return changes && changes.length > 0 ? changes[changes.length - 1].type : undefined;
}

function getAegisMetadata(): AegisMetadata {
  return { ...aegisMetadata.value };
}

function clearAegisMetadata() {
  aegisMetadata.value = {};
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

export function useAegisMetadataTracking() {
  return {
    trackAIChange,
    untrackAIChange,
    getAIChangeType,
    getAegisMetadata,
    clearAegisMetadata,
    setAegisMetadata,
    hasAegisChanges,
    getFieldAegisTypeFromHistory,
  };
}

export function determineChangeType(
  originalSuggestion: string,
  currentValue: string,
): AegisChangeType | null {
  if (!originalSuggestion || !currentValue) return null;

  if (originalSuggestion === currentValue) {
    return 'AI';
  }

  // If current value is different from original suggestion, it's a partial change
  return 'Partial AI';
}
