import { computed, ref, unref, readonly, type Ref } from 'vue';

import {
  serializeAegisContext,
  type AegisSuggestionContextRefs,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { useSimpleFeedback } from '@/composables/aegis/useUnifiedAegisFeedback';

import { AegisAIService } from '@/services/AegisAIService';
import { useToastStore } from '@/stores/ToastStore';
import type { ComponentsSuggestionDetails } from '@/types/aegisAI';

export function useAegisSuggestComponents(
  context: AegisSuggestionContextRefs,
  valueRef: Ref<null | string[] | undefined>,
) {
  const toastStore = useToastStore();
  const service = new AegisAIService();
  const { trackAIChange, untrackAIChange } = useAegisMetadataTracking();
  const previousValue = ref<null | string[] | undefined>(null);
  const selectedSuggestionIndex = ref(0);
  const hasAppliedSuggestion = ref(false);

  const details = ref<ComponentsSuggestionDetails>({
    components: null,
    ecosystems: null,
    confidence: undefined,
    explanation: undefined,
    tools_used: undefined,
  });

  // Track suggestion session ID for feedback system
  const { sendFeedback: sendFeedbackApi } = useSimpleFeedback();
  const userFeedbackSent = ref(false);

  const isCveIdValid = computed(() => {
    const cveId = unref(context?.cveId?.value ?? context?.cveId);
    if (cveId == null) return false;
    return /^CVE-\d{4}-\d{4,7}$/i.test(cveId);
  });

  const canSuggest = computed(() => isCveIdValid.value && !service.isFetching.value);

  async function suggestComponents() {
    const data = await getSuggestion();
    if (!data) return; // Error already handled by getSuggestion
    if (!data.components?.length) {
      toastStore.addToast({
        title: 'AI Components Suggestions',
        body: 'No valid component suggestions received.',
      });
      return;
    }

    details.value = {
      components: data.components,
      ecosystems: data.ecosystems,
      confidence: data.confidence,
      explanation: data.explanation,
      tools_used: data.tools_used,
    };

    selectSuggestion(0);
  }

  async function getSuggestion(): Promise<ComponentsSuggestionDetails | null> {
    if (!canSuggest.value) return null;

    try {
      const contextData = serializeAegisContext(context);
      const response = await service.analyzeCVEWithContext({
        ...contextData,
        feature: 'suggest-affected-components',
        detail: true,
      });

      userFeedbackSent.value = false;

      const data = (response as any)?.output || response;

      const isValidComponents = (comp: unknown): comp is string[] =>
        Array.isArray(comp) && comp.every(item => typeof item === 'string');

      return {
        components: isValidComponents(data.components) ? data.components : null,
        ecosystems: data.ecosystems,
        confidence: data.confidence,
        explanation: data.explanation,
        tools_used: data.tools_used,
      } as ComponentsSuggestionDetails;
    } catch (error: any) {
      const errorMessage = error?.data?.detail
        ?? error?.response?.data?.detail
        ?? error?.message
        ?? 'Failed to get suggestion';
      toastStore.addToast({
        title: 'AI Component Suggestion Error',
        body: typeof errorMessage === 'string' ? errorMessage : 'Failed to get AI suggestion',
        css: 'danger',
      });
      return null;
    }
  }

  function selectSuggestion(index: number) {
    if (!details.value?.components || !allSuggestions.value?.[index]) return;

    selectedSuggestionIndex.value = index;

    if (!hasAppliedSuggestion.value) {
      previousValue.value = valueRef.value ? [...valueRef.value] : valueRef.value;
    }

    const suggestionToApply = allSuggestions.value[index];
    valueRef.value = suggestionToApply ? [...suggestionToApply] : null;
    hasAppliedSuggestion.value = true;

    trackAIChange('components', 'AI', valueRef.value ? JSON.stringify(valueRef.value) : undefined);
  }

  function revert() {
    if (previousValue.value === null) {
      valueRef.value = null;
    } else if (previousValue.value === undefined) {
      valueRef.value = undefined;
    } else {
      valueRef.value = [...previousValue.value];
    }

    details.value = {
      components: null,
      ecosystems: null,
      confidence: undefined,
      explanation: undefined,
      tools_used: undefined,
    };

    selectedSuggestionIndex.value = 0;
    previousValue.value = null;
    userFeedbackSent.value = false;
    hasAppliedSuggestion.value = false;

    // Untrack the AI change
    untrackAIChange('components');
  }

  async function sendFeedback(kind: 'negative' | 'positive', comment = '') {
    if (userFeedbackSent.value) return;
    if (!details.value?.components) return;

    const actualValue = valueRef.value || [];

    const feedbackSent = await sendFeedbackApi(
      'components',
      actualValue,
      kind,
      comment,
      'suggest-affected-components',
    );

    if (feedbackSent) {
      userFeedbackSent.value = true;
    }
  }

  const allSuggestions = computed(() => {
    if (!details.value?.components) return [];
    // For components, we return a single suggestion that contains all the components
    return [details.value.components];
  });

  const computedHasAppliedSuggestion = computed(() => {
    return hasAppliedSuggestion.value;
  });

  const canShowFeedback = computed(() => {
    return hasAppliedSuggestion.value && !userFeedbackSent.value;
  });

  return {
    allSuggestions: readonly(allSuggestions) as Ref<string[][]>,
    canShowFeedback: readonly(canShowFeedback),
    canSuggest: readonly(canSuggest),
    details: readonly(details) as Ref<ComponentsSuggestionDetails>,
    hasAppliedSuggestion: readonly(computedHasAppliedSuggestion),
    isFetchingSuggestion: service.isFetching,
    revert,
    selectedSuggestionIndex: readonly(selectedSuggestionIndex),
    selectSuggestion,
    sendFeedback,
    suggestComponents,
  };
}
