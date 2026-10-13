import { defineComponent, h, nextTick, ref, type Ref } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';

import { provideFullFlawSuggestions, useFullFlawSuggestionField } from '@/composables/aegis/useFullFlawSuggestions';
import type { SuggestionField } from '@/composables/aegis/useFullFlawSuggestions';

import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { OsimRuntimeType } from '@/types/zodOsim';

import AegisMultiSuggest from '../AegisMultiSuggest.vue';

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('@/stores/ToastStore', () => ({ useToastStore: () => ({ addToast }) }));

const multiAnalysis = vi.spyOn(AegisAIService.prototype, 'analyzeCVEMultipleFeatures');
const runtime = osimRuntime as Ref<OsimRuntimeType>;
const fieldLabels: Record<SuggestionField, string> = {
  title: 'Title',
  cve_description: 'Description',
  components: 'Source Component',
  impact: 'Impact',
  _cvss3_vector: 'CVSS v3',
  cwe_id: 'CWE',
  statement: 'Statement',
  mitigation: 'Mitigation',
};
const fields = Object.keys(fieldLabels) as SuggestionField[];
const wrappers: ReturnType<typeof mount>[] = [];

function setup(initialValues: Partial<Record<SuggestionField, unknown>> = {}) {
  const values = Object.fromEntries(fields.map(field => [field, ref<unknown>(
    field in initialValues ? initialValues[field] : field === 'components' ? ['existing'] : 'Existing value',
  )]));
  const disabled = ref(false);
  let coordinator!: ReturnType<typeof provideFullFlawSuggestions>;
  const wrapper = mount(defineComponent({
    setup() {
      coordinator = provideFullFlawSuggestions({ cveId: ref('CVE-2024-1234') }, () => 'flaw-1');
      for (const field of fields) {
        useFullFlawSuggestionField({
          field, value: values[field], isFetching: ref(false), apply: vi.fn(),
        }, coordinator);
      }
      return () => h(AegisMultiSuggest, { coordinator, disabled: disabled.value });
    },
  }), { attachTo: document.body });
  wrappers.push(wrapper);
  return { wrapper, values, disabled, coordinator };
}

function checkedFields(wrapper: ReturnType<typeof setup>['wrapper']) {
  return wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')
    .filter(input => input.element.checked)
    .map(input => input.element.value);
}

beforeEach(() => {
  vi.clearAllMocks();
  multiAnalysis.mockResolvedValue({ results: {}, errors: {} });
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

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

it('shows eight fields in a yellow table dropdown with Select all and Submit at the bottom', async () => {
  const { wrapper } = setup();
  const trigger = wrapper.get('button');
  expect(trigger.text()).toBe('Multi Suggest');
  expect(trigger.attributes('type')).toBe('button');
  expect(trigger.classes()).toContain('btn-warning');
  expect(trigger.attributes('aria-expanded')).toBe('false');
  expect(wrapper.find('table').exists()).toBe(false);
  await trigger.trigger('click');

  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(wrapper.findAll('tbody tr').map(row => row.get('label').text())).toEqual(Object.values(fieldLabels));
  expect(wrapper.findAll('tbody tr')).toHaveLength(8);
  for (const row of wrapper.findAll('tbody tr')) {
    expect(row.get('label').attributes('for')).toBe(row.get('input').attributes('id'));
    expect(row.get('input').attributes('type')).toBe('checkbox');
  }
  expect(wrapper.get('button[title="Select all"] i').classes()).toContain('bi-check-all');
  expect(wrapper.get('.dropdown-menu').element.lastElementChild?.textContent?.trim()).toBe('Submit');
  expect(wrapper.get('.dropdown-menu > button').attributes('type')).toBe('button');
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it.each([null, undefined, '', ' \t\n '])('default-selects empty text (%j) and an empty array', async (empty) => {
  const initialValues = Object.fromEntries(fields.map(field => [field, field === 'components' ? [] : empty]));
  const { wrapper } = setup(initialValues);
  await wrapper.get('button').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expect(wrapper.get<HTMLButtonElement>('.dropdown-menu > button').element.disabled).toBe(false);
});

it('leaves populated fields unchecked and disables Submit when no fields are selected', async () => {
  const { wrapper } = setup({ title: '  A title  ', components: ['kernel'] });
  await wrapper.get('button').trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  const submit = wrapper.get<HTMLButtonElement>('.dropdown-menu > button');
  expect(submit.element.disabled).toBe(true);
  submit.element.click();
  await flushPromises();
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(true);
});

it('preserves choices while open and recomputes defaults from unsaved values on every reopen', async () => {
  const { values, wrapper } = setup({ cve_description: '', components: [] });
  const trigger = wrapper.get('button');
  await trigger.trigger('click');
  expect(checkedFields(wrapper)).toEqual(['cve_description', 'components']);
  await wrapper.get('#multi-suggest-cve_description').setValue(false);
  await wrapper.get('#multi-suggest-title').setValue(true);
  values.title.value = '';
  values.cve_description.value = 'Unsaved description';
  values.components.value = ['Unsaved component'];
  values.statement.value = ' \t ';
  await nextTick();
  expect(checkedFields(wrapper)).toEqual(['title', 'components']);
  await trigger.trigger('click');
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  await trigger.trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title', 'statement']);
});

it('selects every enabled field with Select all and submits only the fields that remain checked', async () => {
  const { coordinator, wrapper } = setup();
  const suggestAll = vi.spyOn(coordinator, 'suggestAll');
  await wrapper.get('button').trigger('click');
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  for (const field of fields.filter(field => field !== 'title' && field !== 'mitigation')) {
    await wrapper.get(`#multi-suggest-${field}`).setValue(false);
  }
  await wrapper.get('.dropdown-menu > button').trigger('click');
  await flushPromises();

  expect(suggestAll).toHaveBeenCalledExactlyOnceWith(['title', 'mitigation']);
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    features: [
      'suggest-description', 'suggest-affected-components', 'suggest-impact', 'suggest-cwe', 'suggest-statement',
    ],
  }));
});

it('renders only fields enabled by runtime flags, including a single member of a paired result', async () => {
  runtime.value.flags = { aiDescriptionSuggestions: true, aiCvssSuggestions: true, aiMitigationSuggestions: true };
  const { wrapper } = setup({ cve_description: '', _cvss3_vector: '', mitigation: '' });
  await wrapper.get('button').trigger('click');
  expect(wrapper.findAll('tbody label').map(label => label.text())).toEqual(['Description', 'CVSS v3', 'Mitigation']);
  expect(checkedFields(wrapper)).toEqual(['cve_description', '_cvss3_vector', 'mitigation']);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(['cve_description', '_cvss3_vector', 'mitigation']);
});

it('disables Submit when the only checked field becomes disabled while the menu is open', async () => {
  const { wrapper } = setup({ title: '' });
  await wrapper.get('button').trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
  runtime.value.flags!.aiTitleSuggestions = false;
  await nextTick();
  expect(wrapper.find('#multi-suggest-title').exists()).toBe(false);
  expect(wrapper.get<HTMLButtonElement>('.dropdown-menu > button').element.disabled).toBe(true);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('blocks opening when disabled and closes an open menu when the form becomes disabled', async () => {
  const { disabled, wrapper } = setup({ title: '' });
  const trigger = wrapper.get<HTMLButtonElement>('button');
  await trigger.trigger('click');
  disabled.value = true;
  await nextTick();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(trigger.element.disabled).toBe(true);
  trigger.element.click();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  disabled.value = false;
  await nextTick();
  await trigger.trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
});

it('closes on Escape without submitting and returns focus to the trigger', async () => {
  const { wrapper } = setup({ title: '' });
  const trigger = wrapper.get('button');
  await trigger.trigger('click');
  const input = wrapper.get<HTMLInputElement>('#multi-suggest-title');
  input.element.focus();
  await input.trigger('keydown', { key: 'Escape' });
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(document.activeElement).toBe(trigger.element);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('shows a busy state after Submit, blocks repeated requests, and restores defaults for an error retry', async () => {
  let reject!: (error: Error) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const { wrapper } = setup({ title: '' });
  const trigger = wrapper.get<HTMLButtonElement>('button');
  await trigger.trigger('click');
  await wrapper.get('.dropdown-menu > button').trigger('click');
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(trigger.element.disabled).toBe(true);
  expect(trigger.attributes('aria-busy')).toBe('true');
  expect(trigger.get('[role="status"]').text()).toBe('Loading...');
  trigger.element.click();
  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  reject(new Error('Service unavailable'));
  await flushPromises();

  expect(trigger.element.disabled).toBe(false);
  expect(trigger.attributes('aria-busy')).toBe('false');
  expect(trigger.find('[role="status"]').exists()).toBe(false);
  expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion Error', body: 'Service unavailable' });
  await trigger.trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
  await wrapper.get('.dropdown-menu > button').trigger('click');
  await flushPromises();
  expect(multiAnalysis).toHaveBeenCalledTimes(2);
});
