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

import { useFullFlawSuggestionField, type AegisSuggestionData } from './useFullFlawSuggestions';

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

/** Creates suggestion actions for one flaw field and connects them to bulk requests. */
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

  const { isBulkBusy, isBulkFetching } = useFullFlawSuggestionField({
    field: fieldName,
    value: valueRef,
    isFetching: service.isFetching,
    apply: data => ({
      cwe_id: suggestCwe,
      impact: suggestImpact,
      _cvss3_vector: suggestCvss,
      statement: suggestStatement,
      mitigation: suggestMitigation,
      components: suggestComponents,
    })[fieldName](data),
  });
  const isFetchingSuggestion = computed(() => service.isFetching.value || isBulkFetching.value);

  // Track suggestion session ID for feedback system
  const { sendFeedback: sendFeedbackApi } = useSimpleFeedback();
  const userFeedbackSent = ref(false);

  const isCveIdValid = computed(() => {
    const cveId = unref(context?.cveId?.value ?? context?.cveId);
    if (cveId == null) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !service.isFetching.value && !isBulkBusy.value);

  /** Applies the returned CWE candidates and selects the first candidate. */
  async function suggestCwe(response?: AegisSuggestionData) {
    const data = response ? receiveSuggestion(response) : await getSuggestion();
    if (!data) return; // Error already handled by getSuggestion
    if (!('cwe' in data) || !data.cwe || data.cwe.length === 0) {
      toastStore.addToast({ title: 'AI CWE Suggestions', body: 'No valid CWE suggestions received.' });
      return;
    }
    details.value.cwe = data.cwe;
    applySuggestion(data.cwe[0]);
  }

  /** Applies a suggestion through the shared AI change tracker. */
  async function applySuggestion(suggestion: string | string[]) {
    aegisSuggestionWatcher.applyAISuggestion(suggestion);
    userFeedbackSent.value = false; // Reset feedback state for new suggestion
    successToast();
  }

  /** Shows the normal single-field success notification when appropriate. */
  function successToast() {
    if (isBulkBusy.value) return;
    toastStore.addToast({
      title: 'AI Suggestion Applied',
      body: 'Suggestion applied. Always review AI generated responses prior to use.',
      css: 'info',
      timeoutMs: 8000,
    });
  }

  /** Applies the returned impact value. */
  async function suggestImpact(response?: AegisSuggestionData) {
    const data = response ? receiveSuggestion(response) : await getSuggestion();
    if (!data) return;
    if (!('impact' in data) || !data.impact) {
      toastStore.addToast({ title: 'AI Impact Suggestions', body: 'No valid impact suggestion received.' });
      return;
    }
    details.value.impact = data.impact;
    applySuggestion(data.impact);
  }

  /** Applies the returned CVSS vector suggestion. */
  async function suggestCvss(response?: AegisSuggestionData) {
    const data = response ? receiveSuggestion(response) : await getSuggestion();
    if (!data) return;
    if (!('cvss3_vector' in data) || !data.cvss3_vector || typeof data.cvss3_vector !== 'string') {
      toastStore.addToast({ title: 'AI CVSS Vector Suggestions', body: 'No valid CVSS vector suggestion received.' });
      return;
    }
    details.value.cvss3_vector = data.cvss3_vector;
    applySuggestion(data.cvss3_vector);
  }

  /** Applies the returned statement suggestion. */
  async function suggestStatement(response?: AegisSuggestionData) {
    const data = response ? receiveSuggestion(response) : await getSuggestion();
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

  /** Applies the returned mitigation suggestion. */
  async function suggestMitigation(response?: AegisSuggestionData) {
    const data = response ? receiveSuggestion(response) : await getSuggestion();
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

  /** Applies the returned affected-component suggestions. */
  async function suggestComponents(response?: AegisSuggestionData) {
    const data = response ? receiveSuggestion(response) : await getSuggestion();
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

  /** Fetches and normalizes a single-field suggestion response. */
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

      return receiveSuggestion(data);
    } catch (e: any) {
      const msg = e?.message ?? e?.data?.detail ?? 'Request failed';
      toastStore.addToast({ title: 'AI Suggestion Error', body: msg });
      return; // Return undefined, don't throw
    }
  }

  /** Stores shared response details before a field-specific value is applied. */
  function receiveSuggestion(data: AegisSuggestionData) {
    if (!aegisSuggestionWatcher.hasAppliedSuggestion.value && previousValue.value === null) {
      previousValue.value = valueRef.value ?? null;
    }
    selectedSuggestionIndex.value = 0;
    details.value = {
      ...defaultDetails(),
      ecosystems: data.ecosystems,
      confidence: data.confidence,
      explanation: data.explanation,
      tools_used: data.tools_used,
    };
    return data;
  }

  /** Restores the field value from before the current AI suggestion session. */
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

  /** Selects one of the returned alternatives and applies it. */
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
    const notFetching = !isFetchingSuggestion.value;
    const feedbackNotSent = !userFeedbackSent.value;
    return hasApplied && notFetching && feedbackNotSent;
  });

  const hasMultipleSuggestions = computed(() => allSuggestions.value.length > 1);

  /** Sends feedback for the original suggestion, rather than a later edit. */
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
    isFetchingSuggestion,
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
