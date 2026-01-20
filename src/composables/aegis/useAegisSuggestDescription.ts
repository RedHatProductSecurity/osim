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
  titleRef: Ref<null | string | undefined>;
};

export type UseAegisSuggestDescriptionReturn = ReturnType<typeof useAegisSuggestDescription>;

export function useAegisSuggestDescription(options: UseAegisSuggestDescriptionOptions) {
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();
  const aegisTitleSuggestionWatcher = useAISuggestionsWatcher('title', options.titleRef);
  const aegisDescriptionSuggestionWatcher = useAISuggestionsWatcher('cve_description', options.descriptionRef);
  const isSuggesting = ref(false);
  const previousTitleValue = ref<null | string | undefined>(null);
  const previousDescriptionValue = ref<null | string | undefined>(null);
  const details = ref<DescriptionSuggestionDetails | null>(null);
  const requestDuration = ref<null | number>(null);
  const titleFeedbackSubmitted = ref<Set<string>>(new Set());
  const descriptionFeedbackSubmitted = ref<Set<string>>(new Set());

  const canShowTitleFeedback = computed(() => {
    const hasApplied = aegisTitleSuggestionWatcher.hasAppliedSuggestion.value;
    const notSuggesting = !isSuggesting.value;
    const titleValue = details.value?.suggested_title ?? '';
    const feedbackNotSubmitted = !titleFeedbackSubmitted.value.has(titleValue);

    return hasApplied && notSuggesting && feedbackNotSubmitted;
  });

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
      // Store previous values if not already stored
      if (!aegisTitleSuggestionWatcher.hasAppliedSuggestion.value && previousTitleValue.value == null) {
        previousTitleValue.value = options.titleRef.value;
      }
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

      const title = data.suggested_title ?? '';
      const description = data.suggested_description ?? '';

      if (!title && !description) {
        toastStore.addToast({ title: 'AI Suggestion', body: 'No valid suggestion received.' });
        return;
      }

      details.value = {
        suggested_title: title,
        suggested_description: description,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };

      // Apply both suggestions - applyAISuggestion will set the value
      if (title) {
        aegisTitleSuggestionWatcher.applyAISuggestion(title);
      }
      if (description) {
        aegisDescriptionSuggestionWatcher.applyAISuggestion(description);
      }

      toastStore.addToast({
        title: 'AI Suggestion Applied',
        body: 'Suggestion applied. Always review AI generated responses prior to use.',
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
    // Clear details if both are reverted
    if (!aegisDescriptionSuggestionWatcher.hasAppliedSuggestion.value) {
      details.value = null;
    }
  }

  function revertDescription() {
    if (previousDescriptionValue.value !== null) {
      options.descriptionRef.value = previousDescriptionValue.value;
    }
    previousDescriptionValue.value = null;
    aegisDescriptionSuggestionWatcher.revertAISuggestion();
    // Clear details if both are reverted
    if (!aegisTitleSuggestionWatcher.hasAppliedSuggestion.value) {
      details.value = null;
    }
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
    canShowTitleFeedback,
    canShowDescriptionFeedback,
    canSuggest,
    details,
    hasAppliedTitleSuggestion: aegisTitleSuggestionWatcher.hasAppliedSuggestion,
    hasAppliedDescriptionSuggestion: aegisDescriptionSuggestionWatcher.hasAppliedSuggestion,
    isSuggesting,
    revertTitle,
    revertDescription,
    sendTitleFeedback,
    sendDescriptionFeedback,
    suggestDescription,
  };
}
