import { computed, ref, unref, readonly, type Ref } from 'vue';

import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAISuggestionsWatcher } from '@/composables/aegis/useAISuggestionsWatcher';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import { useUserStore } from '@/stores/UserStore';
import type {
  CweSuggestionDetails,
  ImpactSuggestionDetails,
  StatementSuggestionDetails,
  SuggestionDetails,
  SuggestableFlawFields,
  MitigationSuggestionDetails,
} from '@/types/aegisAI';
import type { ImpactEnumWithBlankType } from '@/types';

type DetailsFeatureField = 'cvss3_vector' | 'cwe' | 'impact' | 'suggested_mitigation' | 'suggested_statement';
const DetailsFieldFromSuggestionField: Record<SuggestableFlawFields, DetailsFeatureField> = {
  cwe_id: 'cwe',
  impact: 'impact',
  _cvss3_vector: 'cvss3_vector',
  statement: 'suggested_statement',
  mitigation: 'suggested_mitigation',
};

// Map field names to feature values for feedback API
const FeatureNameForFeedback: Record<SuggestableFlawFields, string> = {
  cwe_id: 'suggest-cwe',
  impact: 'suggest-impact',
  _cvss3_vector: 'suggest-cvss',
  statement: 'suggest-statement',
  mitigation: 'suggest-mitigation',
};

export function defaultDetails(): SuggestionDetails {
  return {
    cwe: null,
    cvss3_vector: null,
    impact: null,
    suggested_mitigation: null,
    suggested_statement: null,
  };
}

export function useAegisSuggestion(
  context: AegisSuggestionContextRefs,
  valueRef: Ref<ImpactEnumWithBlankType | null | string>,
  fieldName: SuggestableFlawFields,
) {
  const toastStore = useToastStore();
  const userStore = useUserStore();
  const service = new AegisAIService();
  const aegisSuggestionWatcher = useAISuggestionsWatcher(fieldName, valueRef);
  const previousValue = ref<null | string>(null);
  const selectedSuggestionIndex = ref(0);
  const detailsField = DetailsFieldFromSuggestionField[fieldName];
  const feedbackSubmitted = ref<Set<string>>(new Set());

  const details = ref<SuggestionDetails>(defaultDetails());

  const canShowFeedback = computed(() => {
    const hasApplied = aegisSuggestionWatcher.hasAppliedSuggestion.value;
    const notFetching = !service.isFetching.value;
    const currentSuggestionValue = currentSuggestion.value ?? '';
    const feedbackNotSubmitted = !feedbackSubmitted.value.has(currentSuggestionValue);

    return hasApplied && notFetching && feedbackNotSubmitted;
  });

  const isCveIdValid = computed(() => {
    const cveId = unref(context?.cveId?.value ?? context?.cveId);
    if (cveId == null) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !service.isFetching.value);

  async function suggestCwe() {
    const data = await getSuggestion();
    if (!data) return; // Error already handled by getSuggestion
    if (!('cwe' in data) || !data.cwe || data.cwe.length === 0) {
      toastStore.addToast({ title: 'AI CWE Suggestions', body: 'No valid CWE suggestions received.' });
      return;
    }
    details.value.cwe = data.cwe;
    applySuggestion(data.cwe[0]);
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
    if (!data) return;
    if (!('impact' in data) || !data.impact) {
      toastStore.addToast({ title: 'AI Impact Suggestions', body: 'No valid impact suggestion received.' });
      return;
    }
    details.value.impact = data.impact;
    applySuggestion(data.impact);
  }

  async function suggestCvss() {
    const data = await getSuggestion();
    if (!data) return;
    if (!('cvss3_vector' in data) || !data.cvss3_vector || typeof data.cvss3_vector !== 'string') {
      toastStore.addToast({ title: 'AI CVSS Vector Suggestions', body: 'No valid CVSS vector suggestion received.' });
      return;
    }
    details.value.cvss3_vector = data.cvss3_vector;
    applySuggestion(data.cvss3_vector);
  }

  async function suggestStatement() {
    const data = await getSuggestion();
    if (!data) return;
    const hasValidField = ('suggested_statement' in data)
      && data.suggested_statement !== null
      && data.suggested_statement !== undefined;

    if (!hasValidField) {
      toastStore.addToast({
        title: 'AI Statement Suggestions',
        body: 'No valid statement suggestion received.',
      });
      return;
    }
    details.value.suggested_statement = data.suggested_statement;
    applySuggestion(data.suggested_statement || '');
  }

  async function suggestMitigation() {
    const data = await getSuggestion();
    if (!data) return;
    const hasValidField = ('suggested_mitigation' in data)
      && data.suggested_mitigation !== null
      && data.suggested_mitigation !== undefined;

    if (!hasValidField) {
      toastStore.addToast({
        title: 'AI Mitigation Suggestions',
        body: 'No valid mitigation suggestion received.',
      });
      return;
    }
    details.value.suggested_mitigation = data.suggested_mitigation;
    applySuggestion(data.suggested_mitigation || '');
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
      const contextData = serializeAegisContext(context);

      let data:
        | CweSuggestionDetails
        | ImpactSuggestionDetails
        | MitigationSuggestionDetails
        | StatementSuggestionDetails
        | undefined;
      if (fieldName === 'cwe_id') {
        data = await service.analyzeCVEWithContext({
          feature: 'suggest-cwe',
          ...contextData,
        });
      } else if (fieldName === 'impact' || fieldName === '_cvss3_vector') {
        data = await service.analyzeCVEWithContext({
          feature: 'suggest-impact',
          ...contextData,
        });
      } else if (fieldName === 'statement' || fieldName === 'mitigation') {
        data = await service.analyzeCVEWithContext({
          feature: 'suggest-statement',
          ...contextData,
        });
      }

      if (!data) return;

      details.value = {
        cwe: null,
        cvss3_vector: null,
        impact: null,
        suggested_statement: null,
        suggested_mitigation: null,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      };
      return data;
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.detail ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: msg });
      return; // Return undefined, don't throw
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
      suggested_mitigation: null,
      suggested_statement: null,
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
    if (fieldValue === null || fieldValue === undefined) return [];
    return Array.isArray(fieldValue) ? fieldValue : [fieldValue];
  });

  const hasMultipleSuggestions = computed(() => allSuggestions.value.length > 1);

  async function sendFeedback(kind: 'negative' | 'positive', comment?: string) {
    try {
      const cveId = unref(context?.cveId?.value ?? context?.cveId);
      if (!cveId) {
        toastStore.addToast({
          title: 'Feedback Error',
          body: 'Cannot submit feedback without a valid CVE ID.',
        });
        return;
      }

      const suggestedValue = currentSuggestion.value ?? '';
      const actualValue = previousValue.value ?? '';

      // Check if feedback already submitted for this suggestion
      if (feedbackSubmitted.value.has(suggestedValue)) {
        toastStore.addToast({
          title: 'Feedback Already Submitted',
          body: 'You have already provided feedback for this suggestion.',
          css: 'warning',
        });
        return;
      }

      await service.sendFeedback({
        feature: FeatureNameForFeedback[fieldName],
        cveId,
        email: userStore.userEmail,
        requestTime: `${service.requestDuration.value}ms`,
        actual: actualValue,
        expected: suggestedValue,
        accept: kind === 'positive',
        ...(comment && { rejection_comment: comment }),
      });

      // Mark feedback as submitted for this suggestion
      feedbackSubmitted.value.add(suggestedValue);

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
    suggestStatement,
    suggestMitigation,
  };
}
