import { computed, ref, type Ref } from 'vue';

import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';

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
  const isSuggesting = ref(false);
  const hasAppliedSuggestion = ref(false);
  const previousValue = ref<null | string>(null);
  type CweSuggestionDetails = {
    confidence?: number | string;
    cwe: string;
    explanation?: string;
    tools_used?: string[];
  };
  const details = ref<CweSuggestionDetails | null>(null);
  const canShowFeedback = computed(() => hasAppliedSuggestion.value && !isSuggesting.value);

  const isCveIdValid = computed(() => {
    const cveId = (options.context as any)?.cveId?.value ?? (options.context as any)?.cveId;
    if (!cveId) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !isSuggesting.value);

  function applyValue(value: string) {
    (options.valueRef as Ref<null | string>).value = value;
  }

  async function suggestCwe() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    isSuggesting.value = true;
    try {
      if (!hasAppliedSuggestion.value && previousValue.value == null) {
        previousValue.value = options.valueRef.value;
      }
      const data = await service.analyzeCVEWithContext({
        feature: 'suggest-cwe',
        ...serializeAegisContext(options.context),
      });
      const first = data.cwe?.[0] ?? '';
      if (!first) {
        toastStore.addToast({ title: 'AI Suggestion', body: 'No valid suggestion received.' });
        return;
      }
      applyValue(first);
      details.value = {
        cwe: first,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };
      hasAppliedSuggestion.value = true;
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
      applyValue(previousValue.value as string);
    }
    previousValue.value = null;
    hasAppliedSuggestion.value = false;
    details.value = null;
  }

  function sendFeedback(kind: 'down' | 'up') {
    const url = osimRuntime.value.aegisFeedbackUrl;

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toastStore.addToast({
        title: 'AI Suggestion Feedback',
        body: kind === 'up' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
      });
    }
  }

  return { canSuggest, canShowFeedback, details, hasAppliedSuggestion, isSuggesting, revert, sendFeedback, suggestCwe };
}
