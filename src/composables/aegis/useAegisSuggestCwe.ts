import { computed, ref, type Ref } from 'vue';

import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAISuggestionsWatcher } from '@/composables/aegis/useAISuggestionsWatcher';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { osimRuntime } from '@/stores/osimRuntime';
import type { CweSuggestionDetails } from '@/types/aegisAI';

export type UseAegisSuggestCweOptions = {
  context: AegisSuggestionContextRefs;
  valueRef: Ref<null | string>;
};

export function useAegisSuggestCwe(options: UseAegisSuggestCweOptions) {
  const toastStore = useToastStore();
  const service = new AegisAIService();
  const aegisCweSuggestionWatcher = useAISuggestionsWatcher('cwe_id', options.valueRef);
  const isSuggesting = ref(false);
  const previousValue = ref<null | string>(null);
  const details = ref<CweSuggestionDetails | null>(null);
  const requestDuration = ref<null | number>(null);

  const canShowFeedback = computed(() => aegisCweSuggestionWatcher.hasAppliedSuggestion.value && !isSuggesting.value);

  const isCveIdValid = computed(() => {
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    if (!cveId) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !isSuggesting.value);

  async function suggestCwe() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    isSuggesting.value = true;
    const requestStartTime = Date.now();
    try {
      if (!aegisCweSuggestionWatcher.hasAppliedSuggestion.value && previousValue.value == null) {
        previousValue.value = options.valueRef.value;
      }
      const data = await service.analyzeCVEWithContext({
        feature: 'suggest-cwe' as const,
        ...serializeAegisContext(options.context),
      });
      requestDuration.value = Date.now() - requestStartTime;
      const first = data.cwe?.[0] ?? '';
      if (!first) {
        toastStore.addToast({ title: 'AI Suggestion', body: 'No valid suggestion received.' });
        return;
      }
      details.value = {
        cwe: [first],
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };
      aegisCweSuggestionWatcher.applyAISuggestion(first);
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

  function revert() {
    if (previousValue.value !== null) {
      options.valueRef.value = previousValue.value;
    }
    previousValue.value = null;
    details.value = null;
    aegisCweSuggestionWatcher.revertAISuggestion();
  }

  function sendFeedback(kind: 'down' | 'up') {
    const baseUrl = osimRuntime.value.aegisFeedbackUrl;

    if (baseUrl) {
      const url = buildFeedbackUrl(baseUrl, kind);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toastStore.addToast({
        title: 'AI Suggestion Feedback',
        body: kind === 'up' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
      });
    }
  }

  /**
   * Builds a Google Form URL with prepopulated fields containing flaw data.
   *
   * Form fields:
   * - entry.62718102: CVE ID
   * - entry.77590445: CWE suggested by Aegis
   * - entry.432941906: CWE Request time (in milliseconds)
   * - entry.810710028: Feedback type ("accept" for thumbs up, "reject" for thumbs down)
   */
  function buildFeedbackUrl(baseUrl: string, feedbackKind: 'down' | 'up'): string {
    const params = new URLSearchParams();

    // Get flaw data from context
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    const suggestedCwe = options.valueRef.value;

    // Add CVE ID if available
    if (cveId) {
      params.set('entry.62718102', cveId);
    }

    // Add suggested CWE if available
    if (suggestedCwe) {
      params.set('entry.77590445', suggestedCwe);
    }

    // Add CWE request time if available
    if (requestDuration.value !== null) {
      params.set('entry.432941906', `${requestDuration.value}ms`);
    }

    // Add feedback type
    params.set('entry.810710028', feedbackKind === 'up' ? 'accept' : 'reject');

    return `${baseUrl}?${params.toString()}`;
  }

  return {
    canSuggest,
    canShowFeedback,
    details,
    hasAppliedSuggestion: aegisCweSuggestionWatcher.hasAppliedSuggestion,
    isSuggesting,
    revert,
    sendFeedback,
    suggestCwe,
  };
}
