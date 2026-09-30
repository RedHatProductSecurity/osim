import { computed, ref, type Ref } from 'vue';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';
import type { AegisAIComponentFeatureNameType, DescriptionSuggestionDetails } from '@/types/aegisAI';

import { useAISuggestionsWatcher } from './useAISuggestionsWatcher';
import { serializeAegisContext, type AegisSuggestionContextRefs } from './useAegisSuggestionContext';
import { useFullFlawSuggestionField, type FullFlawSuggestions } from './useFullFlawSuggestions';

export type UseAegisSuggestDescriptionOptions = {
  context: AegisSuggestionContextRefs;
  coordinator?: FullFlawSuggestions;
  descriptionRef: Ref<null | string | undefined>;
};

export type UseAegisSuggestDescriptionReturn = ReturnType<typeof useAegisSuggestDescription>;

/** Creates description suggestion actions for a flaw description ref. */
export function useAegisSuggestDescription(options: UseAegisSuggestDescriptionOptions) {
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();
  const aegisDescriptionSuggestionWatcher = useAISuggestionsWatcher('cve_description', options.descriptionRef);
  const isFetching = ref(false);
  const previousDescriptionValue = ref<null | string | undefined>(null);
  const details = ref<DescriptionSuggestionDetails | null>(null);
  const requestDuration = ref<null | number>(null);
  const descriptionFeedbackSubmitted = ref<Set<string>>(new Set());
  const { isBulkBusy, isBulkFetching } = useFullFlawSuggestionField({
    field: 'cve_description',
    value: options.descriptionRef,
    isFetching,
    apply: applyDescriptionSuggestion,
  }, options.coordinator);
  const isSuggesting = computed(() => isFetching.value || isBulkFetching.value);

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

  const canSuggest = computed(() => isCveIdValid.value && !isSuggesting.value && !isBulkBusy.value);

  /** Requests and applies an AI-generated description. */
  async function suggestDescription() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    isFetching.value = true;
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
      applyDescriptionSuggestion(data, Date.now() - requestStartTime);
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.detail ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: msg });
    } finally {
      isFetching.value = false;
    }
  }

  /** Applies description data returned by either a single-field or bulk request. */
  function applyDescriptionSuggestion(data: DescriptionSuggestionDetails, duration: number) {
    const description = data.suggested_description ?? '';
    if (!description) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'No valid description suggestion received.' });
      return;
    }
    if (!aegisDescriptionSuggestionWatcher.hasAppliedSuggestion.value && previousDescriptionValue.value == null) {
      previousDescriptionValue.value = options.descriptionRef.value;
    }
    requestDuration.value = duration;
    details.value = {
      suggested_description: description,
      confidence: data.confidence,
      explanation: data.explanation,
      tools_used: data.tools_used,
    };
    aegisDescriptionSuggestionWatcher.applyAISuggestion(description);
    if (!isBulkBusy.value) {
      toastStore.addToast({
        title: 'AI Suggestion Applied',
        body: 'Description suggestion applied. Always review AI generated responses prior to use.',
        css: 'info',
        timeoutMs: 8000,
      });
    }
  }

  /** Restores the description value from before the suggestion session. */
  function revertDescription() {
    if (previousDescriptionValue.value !== null) {
      options.descriptionRef.value = previousDescriptionValue.value;
    }
    previousDescriptionValue.value = null;
    aegisDescriptionSuggestionWatcher.revertAISuggestion();
    details.value = null;
  }

  /** Sends feedback for the current description suggestion. */
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
