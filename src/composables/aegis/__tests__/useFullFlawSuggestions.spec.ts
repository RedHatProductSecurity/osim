import { defineComponent, h, ref, type Ref } from 'vue';

import { mount } from '@vue/test-utils';

import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { OsimRuntimeType } from '@/types/zodOsim';
import type { SuggestableFlawFields } from '@/types/aegisAI';

import { provideFullFlawSuggestions } from '../useFullFlawSuggestions';
import { useAegisSuggestTitle } from '../useAegisSuggestTitle';
import { useAegisSuggestDescription } from '../useAegisSuggestDescription';
import { useAegisSuggestion } from '../useAegisSuggestion';

const { addToast, sendFeedback, trackAIChange, untrackAIChange } = vi.hoisted(() => ({
  addToast: vi.fn(),
  trackAIChange: vi.fn(),
  untrackAIChange: vi.fn(),
  sendFeedback: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/stores/ToastStore', () => ({ useToastStore: () => ({ addToast }) }));
vi.mock('@/stores/UserStore', () => ({ useUserStore: () => ({ userEmail: 'test@example.com' }) }));
vi.mock('../useAegisMetadataTracking', () => ({
  useAegisMetadataTracking: () => ({ trackAIChange, untrackAIChange }),
}));
vi.mock('../useUnifiedAegisFeedback', () => ({ useSimpleFeedback: () => ({ sendFeedback }) }));

const runtime = osimRuntime as Ref<OsimRuntimeType>;
const multiAnalysis = vi.spyOn(AegisAIService.prototype, 'analyzeCVEMultipleFeatures');
const singleAnalysis = vi.spyOn(AegisAIService.prototype, 'analyzeCVEWithContext');
const titleFeedback = vi.spyOn(AegisAIService.prototype, 'sendFeedback').mockResolvedValue();
const fields: SuggestableFlawFields[] = ['components', 'impact', '_cvss3_vector', 'cwe_id', 'statement', 'mitigation'];
const response = {
  results: {
    'suggest-description': {
      suggested_title: 'AI title', suggested_description: 'AI description', explanation: 'Reason',
    },
    'suggest-affected-components': { components: ['kernel'] },
    'suggest-impact': { impact: 'IMPORTANT' as const, cvss3_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' },
    'suggest-cwe': { cwe: ['CWE-79', 'CWE-89'], explanation: 'CWE reason' },
    'suggest-statement': { suggested_statement: 'AI statement', suggested_mitigation: 'AI mitigation' },
  },
  errors: {},
};

function setup() {
  const identity = ref({ uuid: 'flaw-1' });
  const title = ref('Original title');
  const description = ref('Original description');
  const context = {
    cveId: ref('CVE-2024-1234'), title, cveDescription: description, commentZero: ref('Original report'),
  };
  const values = Object.fromEntries(
    fields.map(field => [field, ref(field === 'components' ? ['original'] : 'original')]),
  ) as Record<SuggestableFlawFields, Ref<string | string[]>>;
  const actions = {} as Record<SuggestableFlawFields, ReturnType<typeof useAegisSuggestion>>;
  let coordinator!: ReturnType<typeof provideFullFlawSuggestions>;
  let titleActions!: ReturnType<typeof useAegisSuggestTitle>;
  let descriptionActions!: ReturnType<typeof useAegisSuggestDescription>;
  // Provider and child exercise the same injection boundary as FlawForm and its field controls.
  // eslint-disable-next-line vue/one-component-per-file
  const child = defineComponent({
    setup() {
      for (const field of fields) actions[field] = useAegisSuggestion(context, values[field], field);
      return () => h('div');
    },
  });
  // eslint-disable-next-line vue/one-component-per-file
  const wrapper = mount(defineComponent({
    setup() {
      coordinator = provideFullFlawSuggestions(context, () => identity.value);
      titleActions = useAegisSuggestTitle({ context, titleRef: title, coordinator });
      descriptionActions = useAegisSuggestDescription({ context, descriptionRef: description, coordinator });
      return () => h(child);
    },
  }));
  return {
    coordinator, title, description, values, actions, titleActions, descriptionActions, context, identity, wrapper,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  multiAnalysis.mockResolvedValue(response);
  runtime.value.flags = {
    aiTitleSuggestions: true,
    aiDescriptionSuggestions: true,
    aiComponentSuggestions: true,
    aiImpactSuggestions: true,
    aiCvssSuggestions: true,
    aiCweSuggestions: true,
    aiStatementSuggestions: true,
    aiMitigationSuggestions: true,
  };
});

it('requests all enabled fields once and retains field details, tracking, feedback, and revert', async () => {
  const { actions, coordinator, description, descriptionActions, title, titleActions, values } = setup();
  title.value = 'Unsaved title';
  await coordinator.suggestAll();

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: 'CVE-2024-1234',
    title: 'Unsaved title',
    features: [
      'suggest-description', 'suggest-affected-components', 'suggest-impact', 'suggest-cwe', 'suggest-statement',
    ],
  }));
  expect(singleAnalysis).not.toHaveBeenCalled();
  expect(title.value).toBe('AI title');
  expect(description.value).toBe('AI description');
  expect(values.components.value).toEqual(['kernel']);
  expect(values.impact.value).toBe('IMPORTANT');
  expect(values._cvss3_vector.value).toBe(response.results['suggest-impact'].cvss3_vector);
  expect(values.cwe_id.value).toBe('CWE-79');
  expect(values.statement.value).toBe('AI statement');
  expect(values.mitigation.value).toBe('AI mitigation');
  expect(trackAIChange).toHaveBeenCalledTimes(8);
  expect(addToast).toHaveBeenCalledTimes(1);
  expect(actions.cwe_id.details.value.explanation).toBe('CWE reason');
  expect(titleActions.details.value?.explanation).toBe('Reason');
  expect(titleActions.canShowTitleFeedback.value).toBe(true);
  expect(descriptionActions.canShowDescriptionFeedback.value).toBe(true);
  expect(actions.cwe_id.canShowFeedback.value).toBe(true);
  actions.cwe_id.selectSuggestion(1);
  expect(values.cwe_id.value).toBe('CWE-89');
  await actions.impact.sendFeedback('positive');
  expect(sendFeedback).toHaveBeenCalledWith('impact', 'IMPORTANT', 'positive', '', 'suggest-impact');
  await titleActions.sendTitleFeedback('positive');
  expect(titleFeedback).toHaveBeenCalledWith(expect.objectContaining({ actual: 'AI title', feature: 'suggest-title' }));

  titleActions.revertTitle();
  descriptionActions.revertDescription();
  for (const field of fields) actions[field].revert();
  expect(title.value).toBe('Unsaved title');
  expect(description.value).toBe('Original description');
  expect(values.components.value).toEqual(['original']);
  expect(values.impact.value).toBe('original');
  expect(untrackAIChange).toHaveBeenCalledTimes(8);
});

it('requests only enabled features and only applies enabled fields from shared results', async () => {
  runtime.value.flags = { aiTitleSuggestions: true, aiCvssSuggestions: true };
  const { coordinator, description, title, values } = setup();
  await coordinator.suggestAll();
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    features: ['suggest-description', 'suggest-impact'],
  }));
  expect(title.value).toBe('AI title');
  expect(description.value).toBe('Original description');
  expect(values.impact.value).toBe('original');
  expect(values._cvss3_vector.value).toBe(response.results['suggest-impact'].cvss3_vector);
});

it('applies successful results and reports per-feature failures without clearing failed fields', async () => {
  multiAnalysis.mockResolvedValueOnce({
    results: { ...response.results, 'suggest-impact': null },
    errors: { 'suggest-impact': { error: 'RuntimeError', detail: 'Analysis timed out' } },
  });
  const { coordinator, title, values } = setup();
  await coordinator.suggestAll();
  expect(title.value).toBe('AI title');
  expect(values.impact.value).toBe('original');
  expect(values._cvss3_vector.value).toBe('original');
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
    css: 'warning', body: expect.stringContaining('suggest-impact: Analysis timed out'),
  }));
});

it('disables duplicate and single-field requests while a bulk request is pending', async () => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { actions, coordinator, titleActions } = setup();
  const pending = coordinator.suggestAll();
  expect(coordinator.canSuggest.value).toBe(false);
  expect(titleActions.canSuggest.value).toBe(false);
  expect(titleActions.isSuggesting.value).toBe(true);
  expect(actions.impact.canSuggest.value).toBe(false);
  expect(actions.impact.isFetchingSuggestion.value).toBe(true);
  await coordinator.suggestAll();
  await titleActions.suggestTitle();
  await actions.impact.suggestImpact();
  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(singleAnalysis).not.toHaveBeenCalled();
  resolve(response);
  await pending;
  expect(coordinator.canSuggest.value).toBe(true);
  expect(titleActions.isSuggesting.value).toBe(false);
  expect(actions.impact.isFetchingSuggestion.value).toBe(false);
});

it('does not start a bulk request during a single-field request', async () => {
  let resolve!: (result: typeof response.results['suggest-description']) => void;
  singleAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, titleActions } = setup();
  const pending = titleActions.suggestTitle();
  expect(coordinator.canSuggest.value).toBe(false);
  await coordinator.suggestAll();
  expect(multiAnalysis).not.toHaveBeenCalled();
  resolve(response.results['suggest-description']);
  await pending;
  expect(coordinator.canSuggest.value).toBe(true);
});

it('requires a valid CVE and at least one enabled field', async () => {
  const { context, coordinator } = setup();
  context.cveId.value = '';
  await coordinator.suggestAll();
  expect(coordinator.canSuggest.value).toBe(false);
  context.cveId.value = 'CVE-2024-1234';
  runtime.value.flags = {};
  expect(coordinator.isVisible.value).toBe(false);
  await coordinator.suggestAll();
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('keeps user edits made during a request', async () => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, title, values } = setup();
  const pending = coordinator.suggestAll();
  title.value = 'Edited while waiting';
  values.components.value = ['edited'];
  resolve(response);
  await pending;
  expect(title.value).toBe('Edited while waiting');
  expect(values.components.value).toEqual(['edited']);
  expect(values.impact.value).toBe('IMPORTANT');
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
    body: expect.stringContaining('title, components'),
  }));
});

it.each(['identity', 'cve', 'unmount'])('ignores stale results after a change to %s', async (change) => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { context, coordinator, identity, title, wrapper } = setup();
  const pending = coordinator.suggestAll();
  if (change === 'identity') identity.value = { uuid: 'flaw-2' };
  if (change === 'cve') context.cveId.value = 'CVE-2024-9999';
  if (change === 'unmount') wrapper.unmount();
  resolve(response);
  await pending;
  expect(title.value).toBe('Original title');
  expect(trackAIChange).not.toHaveBeenCalled();
});

it('clears loading state on request failure and allows retry', async () => {
  multiAnalysis.mockRejectedValueOnce(new Error('Service unavailable'));
  const { coordinator, title } = setup();
  await coordinator.suggestAll();
  expect(coordinator.isFetching.value).toBe(false);
  expect(title.value).toBe('Original title');
  expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion Error', body: 'Service unavailable' });
  await coordinator.suggestAll();
  expect(title.value).toBe('AI title');
});

it('reports missing results without clearing fields or blocking successful suggestions', async () => {
  multiAnalysis.mockResolvedValueOnce({
    results: { 'suggest-description': response.results['suggest-description'] },
    errors: {},
  });
  const { actions, coordinator, title, values } = setup();
  await coordinator.suggestAll();

  expect(title.value).toBe('AI title');
  expect(values.components.value).toEqual(['original']);
  for (const field of fields.filter(field => field !== 'components')) expect(values[field].value).toBe('original');
  expect(actions.impact.hasAppliedSuggestion.value).toBe(false);
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
    css: 'warning', body: expect.stringContaining('suggest-impact: No suggestion returned.'),
  }));
});

it('skips fields whose feature flag is disabled while a request is pending', async () => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, description, title, titleActions } = setup();
  const pending = coordinator.suggestAll();
  runtime.value.flags!.aiTitleSuggestions = false;
  resolve(response);
  await pending;

  expect(title.value).toBe('Original title');
  expect(titleActions.hasAppliedTitleSuggestion.value).toBe(false);
  expect(description.value).toBe('AI description');
});

it('continues applying other fields if a field handler fails', async () => {
  trackAIChange.mockImplementationOnce(() => { throw new Error('Tracking failed'); });
  const { coordinator, description, values } = setup();
  await coordinator.suggestAll();

  expect(description.value).toBe('AI description');
  expect(values.impact.value).toBe('IMPORTANT');
  expect(values.mitigation.value).toBe('AI mitigation');
  expect(coordinator.isFetching.value).toBe(false);
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
    css: 'warning', body: expect.stringContaining('title: Unable to apply suggestion.'),
  }));
});

it('reverts to the original values after multiple bulk requests and resets CWE selection', async () => {
  const { actions, coordinator, title, titleActions, values } = setup();
  await coordinator.suggestAll();
  actions.cwe_id.selectSuggestion(1);
  multiAnalysis.mockResolvedValueOnce({
    ...response,
    results: {
      ...response.results,
      'suggest-description': { suggested_title: 'Second AI title', suggested_description: 'Second AI description' },
      'suggest-cwe': { cwe: ['CWE-20', 'CWE-22'] },
    },
  });
  await coordinator.suggestAll();

  expect(title.value).toBe('Second AI title');
  expect(values.cwe_id.value).toBe('CWE-20');
  expect(actions.cwe_id.selectedSuggestionIndex.value).toBe(0);
  titleActions.revertTitle();
  actions.cwe_id.revert();
  expect(title.value).toBe('Original title');
  expect(values.cwe_id.value).toBe('original');
});
