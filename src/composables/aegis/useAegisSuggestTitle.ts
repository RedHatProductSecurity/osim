import { computed, ref, type Ref } from 'vue';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';
import type { AegisAIComponentFeatureNameType, DescriptionSuggestionDetails } from '@/types/aegisAI';

import { useAISuggestionsWatcher } from './useAISuggestionsWatcher';
import { serializeAegisContext, type AegisSuggestionContextRefs } from './useAegisSuggestionContext';
import { useFullFlawSuggestionField, type FullFlawSuggestions } from './useFullFlawSuggestions';

export type UseAegisSuggestTitleOptions = {
  context: AegisSuggestionContextRefs;
  coordinator?: FullFlawSuggestions;
  titleRef: Ref<null | string | undefined>;
};

export type UseAegisSuggestTitleReturn = ReturnType<typeof useAegisSuggestTitle>;

/** Creates title suggestion actions for a flaw title ref. */
export function useAegisSuggestTitle(options: UseAegisSuggestTitleOptions) {
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();
  const aegisTitleSuggestionWatcher = useAISuggestionsWatcher('title', options.titleRef);
  const isFetching = ref(false);
  const previousTitleValue = ref<null | string | undefined>(null);
  const details = ref<DescriptionSuggestionDetails | null>(null);
  const requestDuration = ref<null | number>(null);
  const titleFeedbackSubmitted = ref<Set<string>>(new Set());
  const { isBulkBusy, isBulkFetching } = useFullFlawSuggestionField({
    field: 'title',
    value: options.titleRef,
    isFetching,
    apply: applyTitleSuggestion,
  }, options.coordinator);
  const isSuggesting = computed(() => isFetching.value || isBulkFetching.value);

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

  const canSuggest = computed(() => isCveIdValid.value && !isSuggesting.value && !isBulkBusy.value);

  /** Requests and applies an AI-generated title. */
  async function suggestTitle() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    isFetching.value = true;
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

      applyTitleSuggestion(data, Date.now() - requestStartTime);
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.detail ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: msg });
    } finally {
      isFetching.value = false;
    }
  }

  /** Applies title data returned by either a single-field or bulk request. */
  function applyTitleSuggestion(data: DescriptionSuggestionDetails, duration: number) {
    const title = data.suggested_title ?? '';
    if (!title) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'No valid title suggestion received.' });
      return;
    }
    if (!aegisTitleSuggestionWatcher.hasAppliedSuggestion.value && previousTitleValue.value == null) {
      previousTitleValue.value = options.titleRef.value;
    }
    requestDuration.value = duration;
    details.value = {
      suggested_title: title,
      suggested_description: data.suggested_description,
      confidence: data.confidence,
      explanation: data.explanation,
      tools_used: data.tools_used,
    };
    aegisTitleSuggestionWatcher.applyAISuggestion(title);
    if (!isBulkBusy.value) {
      toastStore.addToast({
        title: 'AI Suggestion Applied',
        body: 'Title suggestion applied. Always review AI generated responses prior to use.',
        css: 'info',
        timeoutMs: 8000,
      });
    }
  }

  /** Restores the title value from before the suggestion session. */
  function revertTitle() {
    if (previousTitleValue.value !== null) {
      options.titleRef.value = previousTitleValue.value;
    }
    previousTitleValue.value = null;
    aegisTitleSuggestionWatcher.revertAISuggestion();
    details.value = null;
  }

  /** Sends feedback for the current title suggestion. */
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
