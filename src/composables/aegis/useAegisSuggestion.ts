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
  AegisAIComponentFeatureNameType,
  SuggestionDetails,
  SuggestableFlawFields,
} from '@/types/aegisAI';
import type { ImpactEnumWithBlankType } from '@/types';

type DetailsFeatureField = 'cvss3_vector' | 'cwe' | 'impact';
const DetailsFieldFromSuggestionField: Record<SuggestableFlawFields, DetailsFeatureField> = {
  cwe_id: 'cwe',
  impact: 'impact',
  _cvss3_vector: 'cvss3_vector',
};

export function useAegisSuggestion(
  context: AegisSuggestionContextRefs,
  valueRef: Ref<ImpactEnumWithBlankType | null | string>,
  fieldName: SuggestableFlawFields,
) {
  const toastStore = useToastStore();
  const service = new AegisAIService();
  const aegisSuggestionWatcher = useAISuggestionsWatcher(fieldName, valueRef);
  const previousValue = ref<null | string>(null);
  const selectedSuggestionIndex = ref(0);
  const detailsField = DetailsFieldFromSuggestionField[fieldName];

  const details = ref<SuggestionDetails>({
    cwe: null,
    impact: null,
    cvss3_vector: null,
  });

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
    const data = await getSuggestion();
    if (!data?.cwe || data.cwe.length === 0) {
      toastStore.addToast({ title: 'AI CWE Suggestions', body: 'No valid CWE suggestions received.' });
    } else {
      details.value.cwe = data.cwe;
      applySuggestion(data.cwe[0]);
    }
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
    const data = await getSuggestion();
    if (!data || !data.impact) {
      toastStore.addToast({ title: 'AI Impact Suggestions', body: 'No valid impact suggestion received.' });
    } else {
      const { impact } = data;
      details.value.impact = impact;
      applySuggestion(impact);
    };
  }

  async function suggestCvss() {
    const data = await getSuggestion();
    if (!data?.cvss3_vector || data.cvss3_vector.length === 0) {
      toastStore.addToast({ title: 'AI CVSS Vector Suggestions', body: 'No valid CVSS vector suggestion received.' });
    } else {
      details.value.cvss3_vector = data.cvss3_vector;
      applySuggestion(data.cvss3_vector);
    }
  }

  async function getSuggestion() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    try {
      if (!aegisSuggestionWatcher.hasAppliedSuggestion.value && previousValue.value === null) {
        previousValue.value = valueRef.value;
      }
      const FIELD_NAME_TO_FEATURE_NAME: Record<SuggestableFlawFields, AegisAIComponentFeatureNameType> = {
        cwe_id: 'suggest-cwe',
        impact: 'suggest-impact',
        _cvss3_vector: 'suggest-impact',
      };
      const data = await service.analyzeCVEWithContext({
        feature: FIELD_NAME_TO_FEATURE_NAME[fieldName],
        ...serializeAegisContext(context),
      });
      details.value = {
        cwe: null,
        cvss3_vector: null,
        impact: null,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };
      return data;
    } catch (e: any) {
      const msg = e?.data?.detail ?? e?.message ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: `${msg}` });
    }
  }

  function revert() {
    if (previousValue.value !== null || fieldName === '_cvss3_vector') {
      valueRef.value = previousValue.value;
    }
    previousValue.value = null;
    details.value = {
      cwe: null,
      cvss3_vector: null,
      impact: null,
    };
    selectedSuggestionIndex.value = 0;
    aegisSuggestionWatcher.revertAISuggestion();
  }

  function selectSuggestion(index: number) {
    if (!allSuggestions.value?.[index]) return;
    selectedSuggestionIndex.value = index;
    if (currentSuggestion.value) aegisSuggestionWatcher.applyAISuggestion(currentSuggestion.value);
  }

  const currentSuggestion = computed(() => allSuggestions.value[selectedSuggestionIndex.value] ?? null);

  const allSuggestions = computed(() => {
    const fieldValue = details.value?.[detailsField];
    if (!fieldValue) return [];
    return Array.isArray(fieldValue) ? fieldValue : [fieldValue];
  });

  const hasMultipleSuggestions = computed(() => allSuggestions.value.length > 1);

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
    isFetchingSuggestion: service.isFetching,
    revert,
    selectSuggestion,
    selectedSuggestionIndex: readonly(selectedSuggestionIndex),
    sendFeedback,
    suggestCwe,
    suggestImpact,
    suggestCvss,
  };
}
