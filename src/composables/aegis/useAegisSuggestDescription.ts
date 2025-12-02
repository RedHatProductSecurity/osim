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

  const canShowTitleFeedback = computed(() =>
    aegisTitleSuggestionWatcher.hasAppliedSuggestion.value && !isSuggesting.value,
  );
  const canShowDescriptionFeedback = computed(() =>
    aegisDescriptionSuggestionWatcher.hasAppliedSuggestion.value && !isSuggesting.value,
  );

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
      const msg = e?.data?.detail ?? e?.message ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: `${msg}` });
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

  async function sendTitleFeedback(kind: 'negative' | 'positive') {
    try {
      const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
      const suggestedTitle = details.value?.suggested_title ?? '';
      const actualTitle = previousTitleValue.value ?? '';

      await service.sendFeedback({
        feature: 'suggest-title',
        cveId: cveId || '',
        email: userStore.userEmail,
        requestTime: `${requestDuration.value ?? 0}ms`,
        actual: actualTitle,
        expected: suggestedTitle,
        accept: kind === 'positive',
      });

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

  async function sendDescriptionFeedback(kind: 'negative' | 'positive') {
    try {
      const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
      const suggestedDescription = details.value?.suggested_description ?? '';
      const actualDescription = previousDescriptionValue.value ?? '';

      await service.sendFeedback({
        feature: 'suggest-description',
        cveId: cveId || '',
        email: userStore.userEmail,
        requestTime: `${requestDuration.value ?? 0}ms`,
        actual: actualDescription,
        expected: suggestedDescription,
        accept: kind === 'positive',
      });

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
