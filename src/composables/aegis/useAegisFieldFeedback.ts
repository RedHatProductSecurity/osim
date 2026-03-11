import { computed, ref, type Ref } from 'vue';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';

const botFeedbackSubmitted = ref<Set<string>>(new Set());

function createFeedbackKey(fieldName: string, fieldValue: unknown): null | string {
  if (!fieldValue) return null;
  const valueString = Array.isArray(fieldValue) ? JSON.stringify(fieldValue) : String(fieldValue);
  return `${fieldName}:${valueString}`;
}

function markFeedbackSubmitted(fieldName: string, fieldValue: unknown): void {
  const key = createFeedbackKey(fieldName, fieldValue);
  if (key) botFeedbackSubmitted.value.add(key);
}

function hasFeedbackBeenSubmitted(fieldName: string, fieldValue: unknown): boolean {
  const key = createFeedbackKey(fieldName, fieldValue);
  return key ? botFeedbackSubmitted.value.has(key) : false;
}

export function useAegisFieldFeedback(
  fieldName: string,
  fieldValue: Ref<null | string | string[] | undefined>,
  canShowSuggestionFeedback: Ref<boolean>,
  hasAppliedSuggestion: Ref<boolean>,
  sendSuggestionFeedback: (kind: 'negative' | 'positive', comment: string) => void,
) {
  const { isFieldValueAIBot } = useAegisMetadataTracking();

  const isFieldAIBot = computed(() => isFieldValueAIBot(fieldName, fieldValue.value));

  const canShowFeedbackExtended = computed(() => {
    if (canShowSuggestionFeedback.value) return true;
    if (isFieldAIBot.value && fieldValue.value) {
      return !hasFeedbackBeenSubmitted(fieldName, fieldValue.value);
    }
    return false;
  });

  const handleFieldFeedback = (kind: 'negative' | 'positive', comment = '') => {
    sendSuggestionFeedback(kind, comment);
    if (isFieldAIBot.value && fieldValue.value) {
      markFeedbackSubmitted(fieldName, fieldValue.value);
    }
  };

  return {
    isFieldAIBot,
    canShowFeedbackExtended,
    handleFieldFeedback,
  };
}
