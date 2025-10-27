import { computed, ref, unref, readonly, type Ref } from 'vue';

import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAISuggestionsWatcher } from '@/composables/aegis/useAISuggestionsWatcher';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { osimRuntime } from '@/stores/osimRuntime';
import type {
  CweSuggestionDetails,
  AegisAIComponentFeatureNameType,
  SuggestionDetails,
  ImpactSuggestionDetails,
} from '@/types/aegisAI';

const FIELD_NAME_TO_FEATURE_NAME: Record<string, AegisAIComponentFeatureNameType> = {
  cwe_id: 'suggest-cwe',
  impact: 'suggest-impact',
};

export function useAegisSuggestion(
  context: AegisSuggestionContextRefs,
  valueRef: Ref<null | string>,
  fieldName: string,
) {
  const toastStore = useToastStore();
  const service = new AegisAIService();
  const aegisSuggestionWatcher = useAISuggestionsWatcher(fieldName, valueRef);
  const previousValue = ref<null | string>(null);
  const selectedSuggestionIndex = ref(0);
  // TODO: revisit type handling for details
  const details = ref<CweSuggestionDetails | null | SuggestionDetails>(null);

  const canShowFeedback = computed(
    () => aegisSuggestionWatcher.hasAppliedSuggestion.value && !service.isFetching.value,
  );

  const isCveIdValid = computed(() => {
    const cveId = unref(context?.cveId?.value ?? context?.cveId);
    if (cveId == null) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !service.isFetching.value);

  async function suggestCwe() {
    if (fieldName !== 'cwe_id') return;
    const data = await getSuggestion();
    const first = data.cwe?.[0] ?? '';
    if (!first) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'No valid suggestion received.' });
      return;
    }
    (details.value as CweSuggestionDetails).cwe = [first];
    applySuggestion(first);
  }

  async function applySuggestion(suggestion: string) {
    aegisSuggestionWatcher.applyAISuggestion(suggestion);
    successToast();
  }

  function successToast() {
    toastStore.addToast({
      title: 'AI Suggestion Applied',
      body: 'Suggestion applied. Always review AI generated responses prior to use.',
      css: 'info',
      timeoutMs: 8000,
    });
  }

  async function suggestImpact() {
    if (fieldName !== 'impact') return;
    const data = await getSuggestion();
    const { impact } = data;
    (details.value as ImpactSuggestionDetails).impact = impact;
    applySuggestion(impact);
  }

  async function getSuggestion() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    try {
      if (!aegisSuggestionWatcher.hasAppliedSuggestion.value && previousValue.value == null) {
        previousValue.value = valueRef.value;
      }
      const data = await service.analyzeCVEWithContext({
        feature: FIELD_NAME_TO_FEATURE_NAME[fieldName],
        ...serializeAegisContext(context),
      });
      // requestDuration.value = Date.now() - requestStartTime;
      // const suggestions = data.cwe || [];
      // if (suggestions.length === 0) {
      //   toastStore.addToast({ title: 'AI Suggestion', body: 'No valid suggestion received.' });
      //   return;
      // }
      // details.value = {
      //   cwe: suggestions,
      details.value = {
        // cwe: [first],
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };
      // selectedSuggestionIndex.value = 0;
      // aegisCweSuggestionWatcher.applyAISuggestion(suggestions[0]);
      // toastStore.addToast({
      //   title: 'AI Suggestion Applied',
      //   body: 'Suggestion applied. Always review AI generated responses prior to use.',
      //   css: 'info',
      //   timeoutMs: 8000,
      // });
      return data;
    } catch (e: any) {
      const msg = e?.data?.detail ?? e?.message ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: `${msg}` });
    }
  }

  function revert() {
    if (previousValue.value !== null) {
      valueRef.value = previousValue.value;
    }
    previousValue.value = null;
    details.value = null;
    selectedSuggestionIndex.value = 0;
    aegisSuggestionWatcher.revertAISuggestion();
  }

  function selectSuggestion(index: number) {
    if (!details.value || !details.value[fieldName] || index < 0 || index >= details.value[fieldName].length) {
      return;
    }
    selectedSuggestionIndex.value = index;
    const selectedCwe = details.value[fieldName][index];
    aegisSuggestionWatcher.applyAISuggestion(selectedCwe);
  }

  const currentSuggestion = computed(() => {
    if (!details.value?[fieldName] || selectedSuggestionIndex.value >= details.value[fieldName].length) {
      return null;
    }
    return details.value[fieldName][selectedSuggestionIndex.value];
  });

  const allSuggestions = computed(() => {
    return details.value?[fieldName] || [];
  });

  const hasMultipleSuggestions = computed(() => {
    return allSuggestions.value.length > 1;
  });

  function sendFeedback(kind: 'negative' | 'positive') {
    const baseUrl = osimRuntime.value.aegisFeedbackUrl;

    if (baseUrl) {
      const url = buildFeedbackUrl(baseUrl, kind);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toastStore.addToast({
        title: 'AI Suggestion Feedback',
        body: kind === 'positive' ? 'Thanks for the positive feedback.' : 'Thanks for the feedback.',
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
  function buildFeedbackUrl(baseUrl: string, feedbackKind: 'negative' | 'positive'): string {
    const params = new URLSearchParams();

    // Get flaw data from context
    const cveId = unref(context?.cveId?.value ?? context?.cveId);
    const suggestedCwe = unref(valueRef.value);

    // Add CVE ID if available
    if (cveId) {
      params.set('entry.62718102', cveId);
    }

    // Add suggested CWE if available
    if (suggestedCwe) {
      params.set('entry.77590445', suggestedCwe);
    }

    // Add CWE request time if available
    if (service.requestDuration.value !== null) {
      params.set('entry.432941906', `${service.requestDuration.value}ms`);
    }

    // Add feedback type
    params.set('entry.810710028', feedbackKind === 'positive' ? 'accept' : 'reject');

    return `${baseUrl}?${params.toString()}`;
  }

  return {
    allSuggestions,
    canSuggest,
    canShowFeedback,
    currentSuggestion,
    details,
    hasMultipleSuggestions,
    hasAppliedSuggestion: aegisSuggestionWatcher.hasAppliedSuggestion,
    isFetching: service.isFetching,
    revert,
    selectSuggestion,
    selectedSuggestionIndex: readonly(selectedSuggestionIndex),
    sendFeedback,
    suggestCwe,
    suggestImpact,
  };
}
