import { computed, ref, unref, readonly, type Ref } from 'vue';

import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAISuggestionsWatcher } from '@/composables/aegis/useAISuggestionsWatcher';
import { useSimpleFeedback } from '@/composables/aegis/useUnifiedAegisFeedback';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import type {
  CweSuggestionDetails,
  ImpactSuggestionDetails,
  StatementSuggestionDetails,
  SuggestionDetails,
  SuggestableFlawFields,
  MitigationSuggestionDetails,
  ComponentsSuggestionDetails,
} from '@/types/aegisAI';
import type { ImpactEnumWithBlankType } from '@/types';

type DetailsFeatureField =
  | 'components'
  | 'cvss3_vector'
  | 'cwe'
  | 'impact'
  | 'suggested_mitigation'
  | 'suggested_statement';
const DetailsFieldFromSuggestionField: Record<SuggestableFlawFields, DetailsFeatureField> = {
  cwe_id: 'cwe',
  impact: 'impact',
  _cvss3_vector: 'cvss3_vector',
  statement: 'suggested_statement',
  mitigation: 'suggested_mitigation',
  components: 'components',
};

// Map field names to feature values for feedback API
const FeatureNameForFeedback: Record<SuggestableFlawFields, string> = {
  cwe_id: 'suggest-cwe',
  impact: 'suggest-impact',
  _cvss3_vector: 'suggest-cvss',
  statement: 'suggest-statement',
  mitigation: 'suggest-mitigation',
  components: 'suggest-affected-components',
};

export function defaultDetails(): SuggestionDetails {
  return {
    cwe: null,
    cvss3_vector: null,
    impact: null,
    suggested_mitigation: null,
    suggested_statement: null,
    components: null,
  };
}

export function useAegisSuggestion(
  context: AegisSuggestionContextRefs,
  valueRef: Ref<ImpactEnumWithBlankType | null | string | string[] | undefined>,
  fieldName: SuggestableFlawFields,
) {
  const toastStore = useToastStore();
  const service = new AegisAIService();
  const aegisSuggestionWatcher = useAISuggestionsWatcher(fieldName, valueRef);
  const previousValue = ref<null | string | string[]>(null);
  const selectedSuggestionIndex = ref(0);
  const detailsField = DetailsFieldFromSuggestionField[fieldName];

  const details = ref<SuggestionDetails>(defaultDetails());

  // Track suggestion session ID for feedback system
  const { sendFeedback: sendFeedbackApi } = useSimpleFeedback();
  const userFeedbackSent = ref(false);

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

  async function applySuggestion(suggestion: string | string[]) {
    aegisSuggestionWatcher.applyAISuggestion(suggestion);
    userFeedbackSent.value = false; // Reset feedback state for new suggestion
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

  async function suggestComponents() {
    const data = await getSuggestion();
    if (!data) return;
    const hasValidField = ('components' in data)
      && data.components !== null
      && data.components !== undefined
      && Array.isArray(data.components)
      && data.components.length > 0;

    if (!hasValidField) {
      toastStore.addToast({
        title: 'AI Components Suggestions',
        body: 'No valid component suggestions received.',
      });
      return;
    }
    details.value.components = data.components;
    applySuggestion(data.components || []);
  }

  async function getSuggestion() {
    if (!canSuggest.value) {
      toastStore.addToast({ title: 'AI Suggestion', body: 'Valid CVE ID required for suggestions.' });
      return;
    }
    try {
      if (!aegisSuggestionWatcher.hasAppliedSuggestion.value && previousValue.value === null) {
        previousValue.value = valueRef.value ?? null;
      }
      const contextData = serializeAegisContext(context);

      let data:
        | ComponentsSuggestionDetails
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
      } else if (fieldName === 'components') {
        const response = await service.analyzeCVEWithContext({
          feature: 'suggest-affected-components',
          detail: true,
          ...contextData,
        });

        const rawData = (response as any)?.output || response;
        const isValidComponents = (comp: unknown): comp is string[] =>
          Array.isArray(comp) && comp.every(item => typeof item === 'string');

        data = {
          components: isValidComponents(rawData.components) ? rawData.components : null,
          ecosystems: rawData.ecosystems,
          confidence: rawData.confidence,
          explanation: rawData.explanation,
          tools_used: rawData.tools_used,
        } as ComponentsSuggestionDetails;
      }

      if (!data) return;

      details.value = {
        cwe: null,
        cvss3_vector: null,
        impact: null,
        suggested_statement: null,
        suggested_mitigation: null,
        components: null,
        ecosystems: data.ecosystems,
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
      components: null,
      ecosystems: null,
    };
    selectedSuggestionIndex.value = 0;
    userFeedbackSent.value = false; // Reset feedback state
    aegisSuggestionWatcher.revertAISuggestion();
  }

  function selectSuggestion(index: number) {
    if (!allSuggestions.value?.[index]) return;
    selectedSuggestionIndex.value = index;
    if (currentSuggestion.value) aegisSuggestionWatcher.applyAISuggestion(currentSuggestion.value);
  }

  const allSuggestions = computed(() => {
    const fieldValue = details.value?.[detailsField];
    if (fieldValue === null || fieldValue === undefined) return [];
    return Array.isArray(fieldValue) ? fieldValue : [fieldValue];
  });

  const currentSuggestion = computed(() => allSuggestions.value[selectedSuggestionIndex.value] ?? null);

  const canShowFeedback = computed(() => {
    const hasApplied = aegisSuggestionWatcher.hasAppliedSuggestion.value;
    const notFetching = !service.isFetching.value;
    const feedbackNotSent = !userFeedbackSent.value;
    return hasApplied && notFetching && feedbackNotSent;
  });

  const hasMultipleSuggestions = computed(() => allSuggestions.value.length > 1);

  async function sendFeedback(kind: 'negative' | 'positive', comment?: string) {
    // Always send the original AI suggestion for feedback, not the modified value
    const actualValue = aegisSuggestionWatcher.originalSuggestion.value ?? valueRef.value;
    const result = await sendFeedbackApi(
      fieldName, actualValue, kind, comment || '', FeatureNameForFeedback[fieldName],
    );
    if (result) {
      userFeedbackSent.value = true;
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
    hasPartialModification: aegisSuggestionWatcher.hasPartialModification,
    originalSuggestion: aegisSuggestionWatcher.originalSuggestion,
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
    suggestComponents,
  };
}
