import { defineComponent, h, ref, type Ref } from 'vue';

import { mount } from '@vue/test-utils';

import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { OsimRuntimeType } from '@/types/zodOsim';
import type { SuggestableFlawFields } from '@/types/aegisAI';

import { provideFullFlawSuggestions, type SuggestionField } from '../useFullFlawSuggestions';
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
const allFields: SuggestionField[] = ['title', 'cve_description', ...fields];
const expectedFeatures: Record<SuggestionField, string> = {
  title: 'suggest-description',
  cve_description: 'suggest-description',
  components: 'suggest-affected-components',
  impact: 'suggest-impact',
  _cvss3_vector: 'suggest-impact',
  cwe_id: 'suggest-cwe',
  statement: 'suggest-statement',
  mitigation: 'suggest-statement',
};
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
const suggestedValues = {
  title: 'AI title',
  cve_description: 'AI description',
  components: ['kernel'],
  impact: 'IMPORTANT',
  _cvss3_vector: response.results['suggest-impact'].cvss3_vector,
  cwe_id: 'CWE-79',
  statement: 'AI statement',
  mitigation: 'AI mitigation',
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
  function fieldAction(field: SuggestableFlawFields, suggest: () => Promise<void>) {
    return {
      isLoading: actions[field].isFetchingSuggestion, canSuggest: actions[field].canSuggest, suggest,
    };
  }
  const fieldActions: Record<SuggestionField, {
    canSuggest: Ref<boolean>;
    isLoading: Ref<boolean>;
    suggest: () => Promise<void>;
  }> = {
    title: {
      isLoading: titleActions.isSuggesting, canSuggest: titleActions.canSuggest, suggest: titleActions.suggestTitle,
    },
    cve_description: {
      isLoading: descriptionActions.isSuggesting,
      canSuggest: descriptionActions.canSuggest,
      suggest: descriptionActions.suggestDescription,
    },
    components: fieldAction('components', actions.components.suggestComponents),
    impact: fieldAction('impact', actions.impact.suggestImpact),
    _cvss3_vector: fieldAction('_cvss3_vector', actions._cvss3_vector.suggestCvss),
    cwe_id: fieldAction('cwe_id', actions.cwe_id.suggestCwe),
    statement: fieldAction('statement', actions.statement.suggestStatement),
    mitigation: fieldAction('mitigation', actions.mitigation.suggestMitigation),
  };
  return {
    coordinator,
    title,
    description,
    values,
    actions,
    fieldActions,
    titleActions,
    descriptionActions,
    context,
    identity,
    wrapper,
  };
}

function expectFieldActivity(
  fieldActions: ReturnType<typeof setup>['fieldActions'], loadingFields: SuggestionField[], busy: boolean,
) {
  for (const field of allFields) {
    expect({ field, isLoading: fieldActions[field].isLoading.value }).toEqual({
      field, isLoading: loadingFields.includes(field),
    });
    expect({ field, canSuggest: fieldActions[field].canSuggest.value }).toEqual({ field, canSuggest: !busy });
  }
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

it.each(allFields)('requests and applies only the selected %s field', async (selectedField) => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { actions, coordinator, description, descriptionActions, fieldActions, title, titleActions, values } = setup();
  const fieldValues = { title, cve_description: description, ...values };
  const originals = Object.fromEntries(allFields.map(field => [field, fieldValues[field].value]));
  const pending = coordinator.suggestAll([selectedField]);

  expectFieldActivity(fieldActions, [selectedField], true);
  for (const field of allFields) expect(fieldValues[field].value).toEqual(originals[field]);
  resolve(response);
  await pending;
  expectFieldActivity(fieldActions, [], false);

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: 'CVE-2024-1234',
    title: 'Original title',
    cve_description: 'Original description',
    comment_zero: 'Original report',
    features: [expectedFeatures[selectedField]],
  }));
  expect(singleAnalysis).not.toHaveBeenCalled();
  for (const field of allFields) {
    expect(fieldValues[field].value).toEqual(field === selectedField ? suggestedValues[field] : originals[field]);
  }
  expect(trackAIChange).toHaveBeenCalledTimes(1);
  expect(titleActions.canShowTitleFeedback.value).toBe(selectedField === 'title');
  expect(descriptionActions.canShowDescriptionFeedback.value).toBe(selectedField === 'cve_description');
  for (const field of fields) expect(actions[field].hasAppliedSuggestion.value).toBe(field === selectedField);
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Multi Suggest', css: 'info' }));

  if (selectedField === 'title') titleActions.revertTitle();
  else if (selectedField === 'cve_description') descriptionActions.revertDescription();
  else actions[selectedField].revert();
  for (const field of allFields) expect(fieldValues[field].value).toEqual(originals[field]);
  expect(untrackAIChange).toHaveBeenCalledTimes(1);
});

it('loads only CWE and Mitigation while blocking every suggestion action for the reported selection', async () => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, description, fieldActions, title, values } = setup();
  const fieldValues = { title, cve_description: description, ...values };
  const originals = Object.fromEntries(allFields.map(field => [field, fieldValues[field].value]));
  const selected: SuggestionField[] = ['cwe_id', 'mitigation'];
  const pending = coordinator.suggestAll(selected);

  expectFieldActivity(fieldActions, selected, true);
  expect(coordinator.canSuggest.value).toBe(false);
  await coordinator.suggestAll(['title', 'statement']);
  for (const field of allFields) await fieldActions[field].suggest();
  expect(multiAnalysis).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    features: ['suggest-cwe', 'suggest-statement'],
  }));
  expect(singleAnalysis).not.toHaveBeenCalled();
  expectFieldActivity(fieldActions, selected, true);
  for (const field of allFields) expect(fieldValues[field].value).toEqual(originals[field]);

  resolve(response);
  await pending;
  expectFieldActivity(fieldActions, [], false);
  expect(coordinator.canSuggest.value).toBe(true);
  for (const field of allFields) {
    expect(fieldValues[field].value).toEqual(selected.includes(field) ? suggestedValues[field] : originals[field]);
  }
});

it.each(['completion', 'error'])('resets loading after %s and filters enabled selections on retry', async (outcome) => {
  let resolveFirst!: (result: typeof response) => void;
  let reject!: (error: Error) => void;
  let resolve!: (result: typeof response) => void;
  multiAnalysis
    .mockReturnValueOnce(new Promise((done, fail) => { resolveFirst = done; reject = fail; }))
    .mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, description, fieldActions, title, values } = setup();
  const fieldValues = { title, cve_description: description, ...values };
  const originals = Object.fromEntries(allFields.map(field => [field, fieldValues[field].value]));
  const first = coordinator.suggestAll(['cwe_id', 'mitigation']);
  expectFieldActivity(fieldActions, ['cwe_id', 'mitigation'], true);
  if (outcome === 'error') reject(new Error('Service unavailable'));
  else resolveFirst(response);
  await first;
  expectFieldActivity(fieldActions, [], false);
  expect(coordinator.canSuggest.value).toBe(true);
  for (const field of allFields) {
    expect(fieldValues[field].value).toEqual(
      outcome === 'completion' && (field === 'cwe_id' || field === 'mitigation')
        ? suggestedValues[field]
        : originals[field],
    );
  }
  const beforeRetry = Object.fromEntries(allFields.map(field => [field, fieldValues[field].value]));

  runtime.value.flags!.aiImpactSuggestions = false;
  const pending = coordinator.suggestAll(['title', 'impact', '_cvss3_vector']);
  expectFieldActivity(fieldActions, ['title', '_cvss3_vector'], true);
  expect(multiAnalysis).toHaveBeenNthCalledWith(2, expect.objectContaining({
    features: ['suggest-description', 'suggest-impact'],
  }));
  runtime.value.flags!.aiImpactSuggestions = true;
  expectFieldActivity(fieldActions, ['title', '_cvss3_vector'], true);
  resolve(response);
  await pending;
  expectFieldActivity(fieldActions, [], false);
  expect(coordinator.canSuggest.value).toBe(true);
  for (const field of allFields) {
    expect(fieldValues[field].value).toEqual(
      field === 'title' || field === '_cvss3_vector' ? suggestedValues[field] : beforeRetry[field],
    );
  }
});

it.each<{ features: string[]; selected: SuggestionField[] }>([
  { selected: ['cve_description', 'title', 'title'], features: ['suggest-description'] },
  { selected: ['_cvss3_vector', 'impact', 'impact'], features: ['suggest-impact'] },
  { selected: ['mitigation', 'statement', 'mitigation'], features: ['suggest-statement'] },
  {
    selected: ['mitigation', 'title', '_cvss3_vector', 'title'],
    features: ['suggest-description', 'suggest-impact', 'suggest-statement'],
  },
  {
    selected: ['cwe_id', 'components', 'cwe_id'],
    features: ['suggest-affected-components', 'suggest-cwe'],
  },
])('requests each feature once for $selected and applies only selected fields', async ({ features, selected }) => {
  const { coordinator, description, title, values } = setup();
  const fieldValues = { title, cve_description: description, ...values };
  const originals = Object.fromEntries(allFields.map(field => [field, fieldValues[field].value]));
  await coordinator.suggestAll(selected);

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect([...multiAnalysis.mock.calls[0][0].features!].sort()).toEqual([...features].sort());
  expect(singleAnalysis).not.toHaveBeenCalled();
  for (const field of allFields) {
    expect(fieldValues[field].value).toEqual(selected.includes(field) ? suggestedValues[field] : originals[field]);
  }
  expect(trackAIChange).toHaveBeenCalledTimes(new Set(selected).size);
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Multi Suggest', css: 'info' }));
});

it.each([
  { field: 'title' as const, feature: 'suggest-description' as const },
  { field: '_cvss3_vector' as const, feature: 'suggest-impact' as const },
  { field: 'mitigation' as const, feature: 'suggest-statement' as const },
])('accepts only $feature for selected $field without missing-result warnings', async ({ feature, field }) => {
  multiAnalysis.mockResolvedValueOnce({ results: { [feature]: response.results[feature] }, errors: {} });
  const { coordinator, description, title, values } = setup();
  const fieldValues = { title, cve_description: description, ...values };
  const originals = Object.fromEntries(allFields.map(key => [key, fieldValues[key].value]));
  await coordinator.suggestAll([field]);

  expect(multiAnalysis).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ features: [feature] }));
  for (const key of allFields) {
    expect(fieldValues[key].value).toEqual(key === field ? suggestedValues[key] : originals[key]);
  }
  expect(trackAIChange).toHaveBeenCalledTimes(1);
  expect(addToast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ css: 'info' }));
});

it('does not request or create suggestion state for an explicitly empty selection', async () => {
  const { actions, coordinator, description, descriptionActions, title, titleActions, values } = setup();
  const fieldValues = { title, cve_description: description, ...values };
  const originals = Object.fromEntries(allFields.map(field => [field, fieldValues[field].value]));
  await coordinator.suggestAll([]);
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(singleAnalysis).not.toHaveBeenCalled();
  expect(trackAIChange).not.toHaveBeenCalled();
  expect(addToast).not.toHaveBeenCalled();
  expect(coordinator.isFetching.value).toBe(false);
  expect(coordinator.canSuggest.value).toBe(true);
  expect(titleActions.hasAppliedTitleSuggestion.value).toBe(false);
  expect(descriptionActions.hasAppliedDescriptionSuggestion.value).toBe(false);
  for (const field of fields) expect(actions[field].hasAppliedSuggestion.value).toBe(false);
  for (const field of allFields) expect(fieldValues[field].value).toEqual(originals[field]);
});

it('filters disabled and duplicate selections without requesting unselected enabled features', async () => {
  const { coordinator, description, title, values } = setup();
  runtime.value.flags = { aiTitleSuggestions: true, aiCvssSuggestions: true };
  await coordinator.suggestAll(['cve_description', 'impact']);
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(singleAnalysis).not.toHaveBeenCalled();
  expect(trackAIChange).not.toHaveBeenCalled();
  expect(addToast).not.toHaveBeenCalled();
  expect(coordinator.isFetching.value).toBe(false);
  await coordinator.suggestAll(['title', 'title', 'cve_description', 'impact']);

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    features: ['suggest-description'],
  }));
  expect(title.value).toBe('AI title');
  expect(description.value).toBe('Original description');
  expect(values.impact.value).toBe('original');
  expect(values._cvss3_vector.value).toBe('original');
  expect(trackAIChange).toHaveBeenCalledTimes(1);
});

it('recomputes requested features when runtime flags change between requests', async () => {
  const { coordinator, description, title, values } = setup();
  runtime.value.flags!.aiTitleSuggestions = false;
  await coordinator.suggestAll(['title', 'impact']);
  expect(multiAnalysis).toHaveBeenNthCalledWith(1, expect.objectContaining({ features: ['suggest-impact'] }));
  expect(title.value).toBe('Original title');
  expect(values.impact.value).toBe('IMPORTANT');

  runtime.value.flags!.aiTitleSuggestions = true;
  runtime.value.flags!.aiImpactSuggestions = false;
  await coordinator.suggestAll(['title', 'impact']);
  expect(multiAnalysis).toHaveBeenCalledTimes(2);
  expect(multiAnalysis).toHaveBeenNthCalledWith(2, expect.objectContaining({ features: ['suggest-description'] }));
  expect(title.value).toBe('AI title');
  expect(description.value).toBe('Original description');
  expect(values._cvss3_vector.value).toBe('original');
  expect(trackAIChange).toHaveBeenCalledTimes(2);
});

it('preserves selected text and in-place array edits during a request and leaves unchecked fields intact', async () => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, description, title, values } = setup();
  const pending = coordinator.suggestAll(['title', 'components', 'impact']);
  title.value = 'Unsaved edit while waiting';
  (values.components.value as string[]).push('added while waiting');
  resolve(response);
  await pending;

  expect(title.value).toBe('Unsaved edit while waiting');
  expect(values.components.value).toEqual(['original', 'added while waiting']);
  expect(values.impact.value).toBe('IMPORTANT');
  expect(description.value).toBe('Original description');
  expect(values._cvss3_vector.value).toBe('original');
  expect(trackAIChange).toHaveBeenCalledTimes(1);
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
    css: 'warning', body: expect.stringContaining('title, components'),
  }));
});

it('keeps failed selected fields intact and supports retry without applying successful unchecked results', async () => {
  multiAnalysis.mockResolvedValueOnce({
    results: { ...response.results, 'suggest-impact': null },
    errors: { 'suggest-impact': { error: 'RuntimeError', detail: 'Analysis timed out' } },
  });
  const { coordinator, description, title, values } = setup();
  await coordinator.suggestAll(['title', '_cvss3_vector']);
  expect(multiAnalysis).toHaveBeenNthCalledWith(1, expect.objectContaining({
    features: ['suggest-description', 'suggest-impact'],
  }));
  expect(title.value).toBe('AI title');
  expect(description.value).toBe('Original description');
  expect(values._cvss3_vector.value).toBe('original');
  expect(values.impact.value).toBe('original');
  expect(values.components.value).toEqual(['original']);
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
    css: 'warning', body: expect.stringContaining('suggest-impact: Analysis timed out'),
  }));
  await coordinator.suggestAll(['_cvss3_vector']);
  expect(multiAnalysis).toHaveBeenCalledTimes(2);
  expect(multiAnalysis).toHaveBeenNthCalledWith(2, expect.objectContaining({ features: ['suggest-impact'] }));
  expect(values._cvss3_vector.value).toBe(response.results['suggest-impact'].cvss3_vector);
  expect(values.impact.value).toBe('original');
});

it('reports only a missing selected feature and allows retry without applying unrelated results', async () => {
  multiAnalysis.mockResolvedValueOnce({ results: { 'suggest-cwe': response.results['suggest-cwe'] }, errors: {} });
  const { actions, coordinator, values } = setup();
  await coordinator.suggestAll(['mitigation']);

  expect(multiAnalysis).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ features: ['suggest-statement'] }));
  expect(values.mitigation.value).toBe('original');
  expect(values.statement.value).toBe('original');
  expect(values.cwe_id.value).toBe('original');
  expect(actions.mitigation.hasAppliedSuggestion.value).toBe(false);
  expect(trackAIChange).not.toHaveBeenCalled();
  expect(coordinator.isFetching.value).toBe(false);
  expect(addToast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    css: 'warning',
    body: expect.stringContaining('suggest-statement: No suggestion returned.'),
  }));
  expect(addToast.mock.calls[0][0].body).not.toMatch(
    /suggest-description|suggest-impact|suggest-cwe|suggest-affected-components/,
  );

  await coordinator.suggestAll(['mitigation']);
  expect(multiAnalysis).toHaveBeenCalledTimes(2);
  expect(multiAnalysis).toHaveBeenNthCalledWith(2, expect.objectContaining({ features: ['suggest-statement'] }));
  expect(values.mitigation.value).toBe('AI mitigation');
  expect(values.statement.value).toBe('original');
  expect(values.cwe_id.value).toBe('original');
  expect(trackAIChange).toHaveBeenCalledTimes(1);
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

it.each(['identity', 'cve', 'unmount'])('ignores stale selected results after a change to %s', async (change) => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { context, coordinator, identity, title, wrapper } = setup();
  const pending = coordinator.suggestAll(['title']);
  if (change === 'identity') identity.value = { uuid: 'flaw-2' };
  if (change === 'cve') context.cveId.value = 'CVE-2024-9999';
  if (change === 'unmount') wrapper.unmount();
  resolve(response);
  await pending;
  expect(title.value).toBe('Original title');
  expect(trackAIChange).not.toHaveBeenCalled();
  expect(addToast).not.toHaveBeenCalled();
  expect(coordinator.isFetching.value).toBe(false);
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

it('skips selected fields whose feature flag is disabled while a request is pending', async () => {
  let resolve!: (result: typeof response) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const { coordinator, description, title, titleActions } = setup();
  const pending = coordinator.suggestAll(['title', 'cve_description']);
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
