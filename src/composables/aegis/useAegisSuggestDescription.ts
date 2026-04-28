import { computed, ref, type Ref } from 'vue';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';
import type { AegisAIComponentFeatureNameType, DescriptionSuggestionDetails } from '@/types/aegisAI';

import { useAISuggestionsWatcher } from './useAISuggestionsWatcher';
import { serializeAegisContext, type AegisSuggestionContextRefs } from './useAegisSuggestionContext';

export type UseAegisSuggestDescriptionOptions = {
  context: AegisSuggestionContextRefs;
  descriptionRef: Ref<null | string | undefined>;
};

export type UseAegisSuggestDescriptionReturn = ReturnType<typeof useAegisSuggestDescription>;

export function useAegisSuggestDescription(options: UseAegisSuggestDescriptionOptions) {
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();
  const aegisDescriptionSuggestionWatcher = useAISuggestionsWatcher('cve_description', options.descriptionRef);
  const isSuggesting = ref(false);
  const previousDescriptionValue = ref<null | string | undefined>(null);
  const details = ref<DescriptionSuggestionDetails | null>(null);
  const requestDuration = ref<null | number>(null);
  const descriptionFeedbackSubmitted = ref<Set<string>>(new Set());

  const canShowDescriptionFeedback = computed(() => {
    const hasApplied = aegisDescriptionSuggestionWatcher.hasAppliedSuggestion.value;
    const notSuggesting = !isSuggesting.value;
    const descriptionValue = details.value?.suggested_description ?? '';
    const feedbackNotSubmitted = !descriptionFeedbackSubmitted.value.has(descriptionValue);

    return hasApplied && notSuggesting && feedbackNotSubmitted;
  });

  const isCveIdValid = computed(() => {
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    if (!cveId) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !isSuggesting.value);

  async function suggestDescription() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    isSuggesting.value = true;
    const requestStartTime = Date.now();
    try {
      // Store previous value if not already stored
      if (!aegisDescriptionSuggestionWatcher.hasAppliedSuggestion.value && previousDescriptionValue.value == null) {
        previousDescriptionValue.value = options.descriptionRef.value;
      }

      const feature: AegisAIComponentFeatureNameType = 'suggest-description';
      const data = await service.analyzeCVEWithContext({
        feature,
        ...serializeAegisContext(options.context),
      });
      // An incoming service logic can be used here
      requestDuration.value = Date.now() - requestStartTime;

      const description = data.suggested_description ?? '';

      if (!description) {
        toastStore.addToast({ title: 'AI Suggestion', body: 'No valid description suggestion received.' });
        return;
      }

      details.value = {
        suggested_description: description,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };

      // Apply only description suggestion
      aegisDescriptionSuggestionWatcher.applyAISuggestion(description);

      toastStore.addToast({
        title: 'AI Suggestion Applied',
        body: 'Description suggestion applied. Always review AI generated responses prior to use.',
        css: 'info',
        timeoutMs: 8000,
      });
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.detail ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: msg });
    } finally {
      isSuggesting.value = false;
    }
  }

  function revertDescription() {
    if (previousDescriptionValue.value !== null) {
      options.descriptionRef.value = previousDescriptionValue.value;
    }
    previousDescriptionValue.value = null;
    aegisDescriptionSuggestionWatcher.revertAISuggestion();
    details.value = null;
  }

  async function sendDescriptionFeedback(kind: 'negative' | 'positive', comment?: string) {
    try {
      const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
      if (!cveId) {
        toastStore.addToast({
          title: 'Feedback Error',
          body: 'Cannot submit feedback without a valid CVE ID.',
        });
        return;
      }

      const suggestedDescription = details.value?.suggested_description ?? '';

      // Check if feedback already submitted for this suggestion
      if (descriptionFeedbackSubmitted.value.has(suggestedDescription)) {
        toastStore.addToast({
          title: 'Feedback Already Submitted',
          body: 'You have already provided feedback for this description suggestion.',
          css: 'warning',
        });
        return;
      }

      await service.sendFeedback({
        feature: 'suggest-description',
        cve_id: cveId,
        email: userStore.userEmail,
        request_time: `${requestDuration.value ?? 0}ms`,
        actual: suggestedDescription,
        accept: kind === 'positive',
        ...(comment && { rejection_comment: comment }),
      });

      // Mark feedback as submitted for this suggestion
      descriptionFeedbackSubmitted.value.add(suggestedDescription);

      toastStore.addToast({
        title: 'AI Suggestion Feedback',
        body: kind === 'positive' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
        css: 'info',
      });
    } catch (error: any) {
      const detail = error?.data?.detail ?? error?.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : (error?.message ?? 'Failed to submit feedback');
      toastStore.addToast({
        title: 'Feedback Error',
        body: msg,
      });
    }
  }

  return {
    canShowDescriptionFeedback,
    canSuggest,
    details,
    hasAppliedDescriptionSuggestion: aegisDescriptionSuggestionWatcher.hasAppliedSuggestion,
    isSuggesting,
    revertDescription,
    sendDescriptionFeedback,
    suggestDescription,
  };
}
