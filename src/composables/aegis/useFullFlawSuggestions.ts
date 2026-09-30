import { computed, inject, onScopeDispose, provide, ref, shallowReactive, type InjectionKey, type Ref } from 'vue';

import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import { useToastStore } from '@/stores/ToastStore';
import type { DescriptionSuggestionDetails, SuggestableFlawFields, SuggestionDetails } from '@/types/aegisAI';

import { serializeAegisContext, type AegisSuggestionContextRefs } from './useAegisSuggestionContext';

export type AegisSuggestionData = DescriptionSuggestionDetails & Partial<SuggestionDetails>;
type SuggestionField = 'cve_description' | 'title' | SuggestableFlawFields;

const fieldConfig = {
  title: { feature: 'suggest-description', flag: 'aiTitleSuggestions' },
  cve_description: { feature: 'suggest-description', flag: 'aiDescriptionSuggestions' },
  components: { feature: 'suggest-affected-components', flag: 'aiComponentSuggestions' },
  impact: { feature: 'suggest-impact', flag: 'aiImpactSuggestions' },
  _cvss3_vector: { feature: 'suggest-impact', flag: 'aiCvssSuggestions' },
  cwe_id: { feature: 'suggest-cwe', flag: 'aiCweSuggestions' },
  statement: { feature: 'suggest-statement', flag: 'aiStatementSuggestions' },
  mitigation: { feature: 'suggest-statement', flag: 'aiMitigationSuggestions' },
} as const;

type SuggestionParticipant = {
  apply: (data: AegisSuggestionData, duration: number) => Promise<void> | void;
  field: SuggestionField;
  isFetching: Ref<boolean>;
  value: Ref<unknown>;
};

export type FullFlawSuggestions = ReturnType<typeof provideFullFlawSuggestions>;
const fullFlawSuggestionsKey: InjectionKey<FullFlawSuggestions> = Symbol('fullFlawSuggestions');

/** Returns whether the runtime flag enables suggestions for a field. */
function isEnabled(field: SuggestionField) {
  return !!osimRuntime.value.flags?.[fieldConfig[field].flag];
}

/** Provides the request coordinator shared by the flaw form and suggestion fields. */
export function provideFullFlawSuggestions(context: AegisSuggestionContextRefs, identity: () => unknown) {
  const service = new AegisAIService();
  const toastStore = useToastStore();
  const participants = shallowReactive(new Set<SuggestionParticipant>());
  const isFetching = ref(false);
  let disposed = false;
  onScopeDispose(() => { disposed = true; });

  const enabledParticipants = computed(() => [...participants].filter(item => isEnabled(item.field)));
  const isVisible = computed(() => enabledParticipants.value.length > 0);
  const canSuggest = computed(() => isVisible.value
    && /^CVE-\d{4}-\d{4,7}$/i.test(context.cveId?.value ?? '')
    && !isFetching.value
    && ![...participants].some(item => item.isFetching.value));

  /** Requests each enabled backend feature once and applies its result to registered fields. */
  async function suggestAll() {
    if (!canSuggest.value) return;
    const currentIdentity = identity();
    const contextData = serializeAegisContext(context);
    const requested = enabledParticipants.value.map(item => ({ item, value: JSON.stringify(item.value.value) }));
    const features = [...new Set(requested.map(({ item }) => fieldConfig[item.field].feature))];
    isFetching.value = true;
    const started = Date.now();
    try {
      const response = await service.analyzeCVEMultipleFeatures({ ...contextData, features });
      // A response belongs to the flaw that requested it, even when the form is reused.
      if (disposed || identity() !== currentIdentity || context.cveId?.value !== contextData.cve_id) return;
      const failures = new Set<string>();
      const skipped: string[] = [];
      for (const { item, value } of requested) {
        if (!participants.has(item) || !isEnabled(item.field)) continue;
        const feature = fieldConfig[item.field].feature;
        const error = response.errors?.[feature];
        const result = response.results?.[feature];
        if (error || !result) {
          failures.add(`${feature}: ${error?.detail ?? 'No suggestion returned.'}`);
          continue;
        }
        if (JSON.stringify(item.value.value) !== value) {
          skipped.push(item.field);
          continue;
        }
        try {
          await item.apply(result, Date.now() - started);
        } catch {
          failures.add(`${item.field}: Unable to apply suggestion.`);
        }
      }
      toastStore.addToast({
        title: 'Full Flaw Suggestions',
        body: [
          'Request complete. Always review AI generated responses prior to use.',
          ...failures,
          ...(skipped.length ? [`Kept fields edited during the request: ${skipped.join(', ')}.`] : []),
        ].join('\n'),
        css: failures.size || skipped.length ? 'warning' : 'info',
        timeoutMs: 8000,
      });
    } catch (error: any) {
      if (!disposed) {
        toastStore.addToast({
          title: 'AI Suggestion Error',
          body: error?.message ?? error?.errorMsg ?? 'Request failed',
        });
      }
    } finally {
      isFetching.value = false;
    }
  }

  const coordinator = { canSuggest, isFetching, isVisible, participants, suggestAll };
  provide(fullFlawSuggestionsKey, coordinator);
  return coordinator;
}

/** Registers a field with the nearest bulk coordinator and exposes its busy state. */
export function useFullFlawSuggestionField(
  participant: SuggestionParticipant,
  coordinator = inject(fullFlawSuggestionsKey, undefined),
) {
  coordinator?.participants.add(participant);
  onScopeDispose(() => coordinator?.participants.delete(participant));
  return {
    isBulkFetching: computed(() => !!coordinator?.isFetching.value && isEnabled(participant.field)),
    isBulkBusy: computed(() => !!coordinator?.isFetching.value),
  };
}
