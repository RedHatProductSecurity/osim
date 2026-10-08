import { ref } from 'vue';

import type { ZodFlawHistoryItemType, AegisChangeType } from '../../types/zodFlaw';
import type { AegisChangeEntry, AegisMetadata, AegisSuggestionMetadata } from '../../types/aegisAI';

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

function getAIBotEntry(fieldName: string): AegisChangeEntry | undefined {
  return aegisMetadata.value[fieldName]?.findLast(entry => entry.type === 'AI-Bot');
}

function formatUnitInterval(value: null | number | string | undefined): null | string {
  if (typeof value === 'string') value = value.trim();
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) return null;
  return numeric.toFixed(2);
}

/** Renders optional suggestion metadata. Missing or out-of-range values are omitted. */
export function formatAegisSuggestionMetadata(
  metadata: AegisSuggestionMetadata | null | undefined,
  separator = '\n',
): string {
  if (!metadata) return '';
  const lines: string[] = [];
  const dataQuality = formatUnitInterval(metadata.data_quality);
  const confidence = formatUnitInterval(metadata.confidence);
  if (dataQuality != null) lines.push(`Data quality: ${dataQuality}`);
  if (confidence != null) lines.push(`Confidence: ${confidence}`);
  const tools = Array.isArray(metadata.tools_used)
    ? metadata.tools_used.flatMap((tool) => {
      if (typeof tool !== 'string') return [];
      const name = tool.trim();
      return name ? [name] : [];
    })
    : [];
  if (tools.length) lines.push(`Tools used: ${tools.join(', ')}`);
  return lines.join(separator);
}

export function withAegisExplanation(
  base: string,
  explanation?: null | string,
  separator = '\n\n',
): string {
  if (!explanation) return base;
  return `${base}${separator}Explanation: ${explanation}`;
}

export function appendAegisSuggestionMetadata(
  tooltip: string,
  metadata?: AegisSuggestionMetadata | null,
  separator = '\n',
): string {
  const extra = formatAegisSuggestionMetadata(metadata, separator);
  if (!extra) return tooltip;
  if (!tooltip) return extra;
  return `${tooltip}${separator}${separator}${extra}`;
}

function getAIBotTooltip(fieldName: string): string {
  const baseText = 'Generated by Aegis-AI-Bot';
  const entry = getAIBotEntry(fieldName);
  const explanation = entry?.explanation;
  const tooltip = withAegisExplanation(baseText, explanation, '<br><br>');
  return appendAegisSuggestionMetadata(tooltip, entry);
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
    getAIBotEntry,
    getAIBotTooltip,
    hasAIBotProcessing,
  };
}
