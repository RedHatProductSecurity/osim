import { computed, ref, type Ref } from 'vue';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { osimRuntime } from '@/stores/osimRuntime';
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

  function sendTitleFeedback(kind: 'negative' | 'positive') {
    const baseUrl = osimRuntime.value.aegisFeedbackUrl;

    if (baseUrl) {
      const url = buildTitleFeedbackUrl(baseUrl, kind);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toastStore.addToast({
        title: 'AI Suggestion Feedback',
        body: kind === 'positive' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
      });
    }
  }

  function sendDescriptionFeedback(kind: 'negative' | 'positive') {
    const baseUrl = osimRuntime.value.aegisFeedbackUrl;

    if (baseUrl) {
      const url = buildDescriptionFeedbackUrl(baseUrl, kind);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toastStore.addToast({
        title: 'AI Suggestion Feedback',
        body: kind === 'positive' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
      });
    }
  }

  /**
   * Builds a Google Form URL with prepopulated fields for title feedback.
   *
   * Form fields:
   * - entry.1910793631: Feature name ("suggest-title")
   * - entry.62718102: CVE ID
   * - entry.77590445: Title suggested by Aegis
   * - entry.432941906: Request time (in milliseconds)
   * - entry.810710028: Feedback type ("accept" for thumbs up, "reject" for thumbs down)
   */
  function buildTitleFeedbackUrl(baseUrl: string, feedbackKind: 'negative' | 'positive'): string {
    const params = new URLSearchParams();

    // Get flaw data from context
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    const suggestedTitle = options.titleRef.value;

    // Add feature name (matches Google Form multiple choice option)
    params.set('entry.1910793631', 'suggest-title');

    // Add CVE ID if available
    if (cveId) {
      params.set('entry.62718102', cveId);
    }

    // Add suggested title if available
    if (suggestedTitle) {
      params.set('entry.77590445', suggestedTitle);
    }

    // Add request time if available
    if (requestDuration.value !== null) {
      params.set('entry.432941906', `${requestDuration.value}ms`);
    }

    // Add feedback type
    params.set('entry.810710028', feedbackKind === 'positive' ? 'accept' : 'reject');

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Builds a Google Form URL with prepopulated fields for description feedback.
   *
   * Form fields:
   * - entry.1910793631: Feature name ("suggest-description")
   * - entry.62718102: CVE ID
   * - entry.77590445: Description suggested by Aegis (truncated to first 100 chars)
   * - entry.432941906: Request time (in milliseconds)
   * - entry.810710028: Feedback type ("accept" for thumbs up, "reject" for thumbs down)
   */
  function buildDescriptionFeedbackUrl(baseUrl: string, feedbackKind: 'negative' | 'positive'): string {
    const params = new URLSearchParams();

    // Get flaw data from context
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    const suggestedDescription = options.descriptionRef.value;

    // Add feature name (matches Google Form multiple choice option)
    params.set('entry.1910793631', 'suggest-description');

    // Add CVE ID if available
    if (cveId) {
      params.set('entry.62718102', cveId);
    }

    // Add suggested description if available (truncated for URL)
    if (suggestedDescription) {
      const truncated = suggestedDescription.substring(0, 100);
      params.set('entry.77590445', truncated);
    }

    // Add request time if available
    if (requestDuration.value !== null) {
      params.set('entry.432941906', `${requestDuration.value}ms`);
    }

    // Add feedback type
    params.set('entry.810710028', feedbackKind === 'positive' ? 'accept' : 'reject');

    return `${baseUrl}?${params.toString()}`;
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
