import { computed, ref, type Ref } from 'vue';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';
import type { AegisAIComponentFeatureNameType, DescriptionSuggestionDetails } from '@/types/aegisAI';

import { useAISuggestionsWatcher } from './useAISuggestionsWatcher';
import { serializeAegisContext, type AegisSuggestionContextRefs } from './useAegisSuggestionContext';

export type UseAegisSuggestTitleOptions = {
  context: AegisSuggestionContextRefs;
  titleRef: Ref<null | string | undefined>;
};

export type UseAegisSuggestTitleReturn = ReturnType<typeof useAegisSuggestTitle>;

export function useAegisSuggestTitle(options: UseAegisSuggestTitleOptions) {
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();
  const aegisTitleSuggestionWatcher = useAISuggestionsWatcher('title', options.titleRef);
  const isSuggesting = ref(false);
  const previousTitleValue = ref<null | string | undefined>(null);
  const details = ref<DescriptionSuggestionDetails | null>(null);
  const requestDuration = ref<null | number>(null);
  const titleFeedbackSubmitted = ref<Set<string>>(new Set());

  const canShowTitleFeedback = computed(() => {
    const hasApplied = aegisTitleSuggestionWatcher.hasAppliedSuggestion.value;
    const notSuggesting = !isSuggesting.value;
    const titleValue = details.value?.suggested_title ?? '';
    const feedbackNotSubmitted = !titleFeedbackSubmitted.value.has(titleValue);

    return hasApplied && notSuggesting && feedbackNotSubmitted;
  });

  const isCveIdValid = computed(() => {
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    if (!cveId) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !isSuggesting.value);

  async function suggestTitle() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    isSuggesting.value = true;
    const requestStartTime = Date.now();
    try {
      // Store previous value if not already stored
      if (!aegisTitleSuggestionWatcher.hasAppliedSuggestion.value && previousTitleValue.value == null) {
        previousTitleValue.value = options.titleRef.value;
      }

      const feature: AegisAIComponentFeatureNameType = 'suggest-description';
      const data = await service.analyzeCVEWithContext({
        feature,
        ...serializeAegisContext(options.context),
      });

      requestDuration.value = Date.now() - requestStartTime;

      const title = data.suggested_title ?? '';

      if (!title) {
        toastStore.addToast({ title: 'AI Suggestion', body: 'No valid title suggestion received.' });
        return;
      }

      details.value = {
        suggested_title: title,
        suggested_description: data.suggested_description,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };

      // Apply only title suggestion
      aegisTitleSuggestionWatcher.applyAISuggestion(title);

      toastStore.addToast({
        title: 'AI Suggestion Applied',
        body: 'Title suggestion applied. Always review AI generated responses prior to use.',
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

  function revertTitle() {
    if (previousTitleValue.value !== null) {
      options.titleRef.value = previousTitleValue.value;
    }
    previousTitleValue.value = null;
    aegisTitleSuggestionWatcher.revertAISuggestion();
    details.value = null;
  }

  async function sendTitleFeedback(kind: 'negative' | 'positive', comment?: string) {
    try {
      const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
      if (!cveId) {
        toastStore.addToast({
          title: 'Feedback Error',
          body: 'Cannot submit feedback without a valid CVE ID.',
        });
        return;
      }

      const suggestedTitle = details.value?.suggested_title ?? '';

      // Check if feedback already submitted for this suggestion
      if (titleFeedbackSubmitted.value.has(suggestedTitle)) {
        toastStore.addToast({
          title: 'Feedback Already Submitted',
          body: 'You have already provided feedback for this title suggestion.',
          css: 'warning',
        });
        return;
      }

      await service.sendFeedback({
        feature: 'suggest-title',
        cve_id: cveId,
        email: userStore.userEmail,
        request_time: `${requestDuration.value ?? 0}ms`,
        actual: suggestedTitle,
        accept: kind === 'positive',
        ...(comment && { rejection_comment: comment }),
      });

      // Mark feedback as submitted for this suggestion
      titleFeedbackSubmitted.value.add(suggestedTitle);

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
    canShowTitleFeedback,
    canSuggest,
    details,
    hasAppliedTitleSuggestion: aegisTitleSuggestionWatcher.hasAppliedSuggestion,
    isSuggesting,
    revertTitle,
    sendTitleFeedback,
    suggestTitle,
  };
}
