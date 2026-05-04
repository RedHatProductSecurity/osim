import { computed, ref, type Ref } from 'vue';

import { useAegisMetadataTracking } from './useAegisMetadataTracking';
import { useSimpleFeedback } from './useUnifiedAegisFeedback';

export function useAegisFieldFeedback(
  fieldName: string,
  fieldValue: Ref<null | string | string[] | undefined>,
  canShowSuggestionFeedback: Ref<boolean>,
  hasAppliedSuggestion: Ref<boolean>,
  sendSuggestionFeedback: (kind: 'negative' | 'positive', comment: string) => void,
) {
  const { isFieldValueAIBot } = useAegisMetadataTracking();
  const { sendFeedback } = useSimpleFeedback();
  const botFeedbackSent = ref(false);

  const isFieldAIBot = computed(() => isFieldValueAIBot(fieldName, fieldValue.value));

  const canShowFeedbackExtended = computed(() => {
    // For user-triggered suggestions, use the original logic
    if (canShowSuggestionFeedback.value) return true;

    // For AI-Bot fields, show if there's a value and feedback hasn't been sent
    if (isFieldAIBot.value && fieldValue.value && !botFeedbackSent.value) return true;
    return false;
  });

  const handleFieldFeedback = async (kind: 'negative' | 'positive', comment = '') => {
    if (isFieldAIBot.value) {
      const result = await sendFeedback(fieldName, fieldValue.value, kind, comment);
      if (result) botFeedbackSent.value = true;
      return result;
    } else {
      return sendSuggestionFeedback(kind, comment);
    }
  };

  return {
    isFieldAIBot,
    canShowFeedbackExtended,
    handleFieldFeedback,
  };
}
