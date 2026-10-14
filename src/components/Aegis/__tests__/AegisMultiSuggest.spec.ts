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

function chooser(wrapper: ReturnType<typeof setup>['wrapper']) {
  return wrapper.get<HTMLButtonElement>('button[aria-label="Choose suggestion fields"]');
}

function actionButton(wrapper: ReturnType<typeof setup>['wrapper']) {
  return wrapper.get('button');
}

function expectAllToggle(wrapper: ReturnType<typeof setup>['wrapper'], allSelected: boolean) {
  const toggle = wrapper.get('thead button');
  expect(toggle.attributes('title')).toBe(allSelected ? 'Unselect all' : 'Select all');
  expect(toggle.attributes('aria-label')).toBe(
    allSelected ? 'Unselect all suggestion fields' : 'Select all suggestion fields',
  );
  expect(toggle.get('i').classes()).toContain(allSelected ? 'bi-x' : 'bi-check-all');
  expect(toggle.get('i').classes()).not.toContain(allSelected ? 'bi-check-all' : 'bi-x');
  expect(toggle.classes()).toContain('border-0');
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

it('shows a gray split action and an accessible field chooser with eight rows and no Submit button', async () => {
  const { wrapper } = setup();
  const action = actionButton(wrapper);
  const trigger = chooser(wrapper);
  expect(action.text()).toBe('Multi Suggest');
  expect(action.attributes('type')).toBe('button');
  expect(action.classes()).toContain('btn-secondary');
  expect(action.classes()).toContain('my-0');
  expect(trigger.attributes('type')).toBe('button');
  expect(trigger.classes()).toContain('btn-secondary');
  expect(trigger.classes()).toContain('my-0');
  expect(wrapper.get('.btn-group').classes()).toContain('my-0');
  expect(wrapper.get('.dropdown').classes()).not.toContain('align-self-end');
  expect(wrapper.get('.dropdown').classes()).not.toContain('mt-2');
  expect(trigger.attributes('aria-expanded')).toBe('false');
  expect(wrapper.find('table').exists()).toBe(false);
  await trigger.trigger('click');

  expect(trigger.attributes('aria-expanded')).toBe('true');
  expect(wrapper.findAll('tbody tr').map(row => row.get('label').text())).toEqual(Object.values(fieldLabels));
  expect(wrapper.findAll('tbody tr')).toHaveLength(8);
  for (const row of wrapper.findAll('tbody tr')) {
    expect(row.get('label').attributes('for')).toBe(row.get('input').attributes('id'));
    expect(row.get('input').attributes('type')).toBe('checkbox');
    expect(row.element.firstElementChild?.contains(row.get('input').element)).toBe(true);
    expect(row.get('label').classes()).not.toContain('fst-italic');
  }
  expect(wrapper.get('button[title="Select all"] i').classes()).toContain('bi-check-all');
  expect(wrapper.get('button[title="Select all"]').classes()).toContain('btn-primary');
  expect(wrapper.get('button[title="Select all"]').classes()).toContain('border-0');
  expect(wrapper.get('button[title="Select all"]').classes().some(css => css.startsWith('btn-outline'))).toBe(false);
  expect(wrapper.findAll('button').some(button => button.text() === 'Submit')).toBe(false);
  expect(wrapper.get('.dropdown-menu').findAll('button')).toHaveLength(1);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('requests only current empty defaults directly without opening the chooser', async () => {
  const { coordinator, wrapper } = setup({ cve_description: ' \t\n ', components: [] });
  const suggestAll = vi.spyOn(coordinator, 'suggestAll');
  await actionButton(wrapper).trigger('click');
  await flushPromises();

  expect(suggestAll).toHaveBeenCalledExactlyOnceWith(['cve_description', 'components']);
  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    features: [
      'suggest-description', 'suggest-affected-components', 'suggest-impact', 'suggest-cwe', 'suggest-statement',
    ],
  }));
  expect(wrapper.find('table').exists()).toBe(false);
  expect(chooser(wrapper).attributes('aria-expanded')).toBe('false');
});

it.each([null, undefined, '', ' \t\n '])('default-selects empty text (%j) and an empty array', async (empty) => {
  const initialValues = Object.fromEntries(fields.map(field => [field, field === 'components' ? [] : empty]));
  const { wrapper } = setup(initialValues);
  expect(actionButton(wrapper).element.disabled).toBe(false);
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expectAllToggle(wrapper, true);
  for (const label of wrapper.findAll('tbody label')) {
    expect(label.text()).not.toContain('(override)');
    expect(label.classes()).not.toContain('fst-italic');
  }
  await wrapper.get('button[title="Unselect all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  expectAllToggle(wrapper, false);
  expect(actionButton(wrapper).element.disabled).toBe(true);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('toggles all fields, restores labels and icons, and preserves the cleared selection after reopening', async () => {
  const { wrapper } = setup();
  await chooser(wrapper).trigger('click');
  expectAllToggle(wrapper, false);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expect(actionButton(wrapper).element.disabled).toBe(false);
  expectAllToggle(wrapper, true);
  await wrapper.get('button[title="Unselect all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  expectAllToggle(wrapper, false);
  expect(actionButton(wrapper).element.disabled).toBe(true);
  expect(chooser(wrapper).element.disabled).toBe(false);
  for (const label of wrapper.findAll('tbody label')) {
    expect(label.text()).not.toContain('(override)');
    expect(label.classes()).not.toContain('fst-italic');
  }
  actionButton(wrapper).element.click();
  await chooser(wrapper).trigger('click');
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  expectAllToggle(wrapper, false);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expectAllToggle(wrapper, true);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('updates the toggle for manual choices and selects all from a partial selection', async () => {
  const { wrapper } = setup();
  await chooser(wrapper).trigger('click');
  await wrapper.get('#multi-suggest-title').setValue(true);
  expectAllToggle(wrapper, false);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expectAllToggle(wrapper, true);
  await wrapper.get('#multi-suggest-mitigation').setValue(false);
  expectAllToggle(wrapper, false);
  expect(checkedFields(wrapper)).toEqual(fields.filter(field => field !== 'mitigation'));
  await wrapper.get('#multi-suggest-mitigation').setValue(true);
  expectAllToggle(wrapper, true);
  await wrapper.get('#multi-suggest-title').setValue(false);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expectAllToggle(wrapper, true);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('determines the toggle state from enabled fields as runtime flags change', async () => {
  runtime.value.flags = { aiTitleSuggestions: true };
  const { wrapper } = setup({ title: '' });
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
  expectAllToggle(wrapper, true);

  runtime.value.flags.aiDescriptionSuggestions = true;
  await nextTick();
  expect(checkedFields(wrapper)).toEqual(['title']);
  expectAllToggle(wrapper, false);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title', 'cve_description']);
  expectAllToggle(wrapper, true);

  runtime.value.flags.aiTitleSuggestions = false;
  await nextTick();
  expect(checkedFields(wrapper)).toEqual(['cve_description']);
  expectAllToggle(wrapper, true);
  await wrapper.get('button[title="Unselect all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  expect(actionButton(wrapper).element.disabled).toBe(true);
  expectAllToggle(wrapper, false);

  runtime.value.flags.aiTitleSuggestions = true;
  await nextTick();
  expect(checkedFields(wrapper)).toEqual([]);
  expectAllToggle(wrapper, false);
  runtime.value.flags = {};
  await nextTick();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(chooser(wrapper).element.disabled).toBe(true);
  runtime.value.flags = { aiTitleSuggestions: true };
  await nextTick();
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  expectAllToggle(wrapper, false);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('disables the main action for no selection but lets the chooser select a populated override', async () => {
  const { wrapper } = setup({ title: '  A title  ', components: ['kernel'] });
  const action = actionButton(wrapper);
  expect(action.element.disabled).toBe(true);
  expect(chooser(wrapper).element.disabled).toBe(false);
  action.element.click();
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  await wrapper.get('#multi-suggest-title').setValue(true);
  expect(action.element.disabled).toBe(false);
  await wrapper.get('#multi-suggest-title').setValue(false);
  expect(action.element.disabled).toBe(true);
  action.element.click();
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(true);
});

it('updates defaults from unsaved values until the chooser is first opened', async () => {
  const { coordinator, values, wrapper } = setup();
  const suggestAll = vi.spyOn(coordinator, 'suggestAll');
  expect(actionButton(wrapper).element.disabled).toBe(true);
  values.title.value = '';
  await nextTick();
  expect(actionButton(wrapper).element.disabled).toBe(false);
  values.title.value = 'Unsaved title';
  values.mitigation.value = ' \t ';
  await nextTick();
  await actionButton(wrapper).trigger('click');
  await flushPromises();
  expect(suggestAll).toHaveBeenCalledExactlyOnceWith(['mitigation']);
  expect(wrapper.find('table').exists()).toBe(false);
});

it('freezes defaults on first open even without checkbox edits and keeps them after close and reopen', async () => {
  const { values, wrapper } = setup({ title: '' });
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
  values.title.value = 'Unsaved title';
  values.cve_description.value = '';
  await nextTick();
  expect(checkedFields(wrapper)).toEqual(['title']);
  await chooser(wrapper).trigger('click');
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('preserves checkbox choices across value edits, close and reopen', async () => {
  const { values, wrapper } = setup({ cve_description: '', components: [] });
  const trigger = chooser(wrapper);
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
  expect(checkedFields(wrapper)).toEqual(['title', 'components']);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('marks only selected populated fields as italic overrides and removes the styling when unchecked', async () => {
  const { wrapper } = setup();
  await chooser(wrapper).trigger('click');
  await wrapper.get('button[title="Select all"]').trigger('click');
  for (const field of fields) {
    const label = wrapper.get(`label[for="multi-suggest-${field}"]`);
    expect(label.text()).toBe(`${fieldLabels[field]} (override)`);
    expect(label.classes()).toContain('fst-italic');
    await wrapper.get(`#multi-suggest-${field}`).setValue(false);
    expect(label.text()).toBe(fieldLabels[field]);
    expect(label.classes()).not.toContain('fst-italic');
  }
  expect(actionButton(wrapper).element.disabled).toBe(true);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('removes override styling when a selected field becomes empty without deselecting it', async () => {
  const { values, wrapper } = setup();
  await chooser(wrapper).trigger('click');
  await wrapper.get('button[title="Select all"]').trigger('click');
  for (const field of fields) values[field].value = field === 'components' ? [] : ' \t\n ';
  await nextTick();
  expect(checkedFields(wrapper)).toEqual(fields);
  for (const field of fields) {
    const label = wrapper.get(`label[for="multi-suggest-${field}"]`);
    expect(label.text()).toBe(fieldLabels[field]);
    expect(label.classes()).not.toContain('fst-italic');
  }
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('selects all without requesting and uses selected overrides from the main action after closing', async () => {
  const { coordinator, wrapper } = setup();
  const suggestAll = vi.spyOn(coordinator, 'suggestAll');
  await chooser(wrapper).trigger('click');
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(fields);
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(suggestAll).not.toHaveBeenCalled();
  for (const field of fields.filter(field => field !== 'title' && field !== 'mitigation')) {
    await wrapper.get(`#multi-suggest-${field}`).setValue(false);
  }
  await chooser(wrapper).trigger('click');
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(multiAnalysis).not.toHaveBeenCalled();
  await actionButton(wrapper).trigger('click');
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
  await chooser(wrapper).trigger('click');
  expect(wrapper.findAll('tbody label').map(label => label.text())).toEqual(['Description', 'CVSS v3', 'Mitigation']);
  expect(checkedFields(wrapper)).toEqual(['cve_description', '_cvss3_vector', 'mitigation']);
  expectAllToggle(wrapper, true);
  await wrapper.get('button[title="Unselect all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual([]);
  expectAllToggle(wrapper, false);
  await wrapper.get('button[title="Select all"]').trigger('click');
  expect(checkedFields(wrapper)).toEqual(['cve_description', '_cvss3_vector', 'mitigation']);
  expectAllToggle(wrapper, true);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('disables the main action when the only checked field becomes disabled but leaves the chooser usable', async () => {
  const { wrapper } = setup({ title: '' });
  await chooser(wrapper).trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
  runtime.value.flags!.aiTitleSuggestions = false;
  await nextTick();
  expect(wrapper.find('#multi-suggest-title').exists()).toBe(false);
  expect(actionButton(wrapper).element.disabled).toBe(true);
  expect(chooser(wrapper).element.disabled).toBe(false);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('blocks opening when disabled and closes an open menu when the form becomes disabled', async () => {
  const { disabled, wrapper } = setup({ title: '' });
  const trigger = chooser(wrapper);
  await trigger.trigger('click');
  disabled.value = true;
  await nextTick();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(trigger.element.disabled).toBe(true);
  expect(actionButton(wrapper).element.disabled).toBe(true);
  trigger.element.click();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  disabled.value = false;
  await nextTick();
  await trigger.trigger('click');
  expect(checkedFields(wrapper)).toEqual(['title']);
});

it('closes on Escape without submitting and returns focus to the trigger', async () => {
  const { wrapper } = setup({ title: '' });
  const trigger = chooser(wrapper);
  await trigger.trigger('click');
  const input = wrapper.get<HTMLInputElement>('#multi-suggest-title');
  input.element.focus();
  await input.trigger('keydown', { key: 'Escape' });
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(document.activeElement).toBe(trigger.element);
  expect(multiAnalysis).not.toHaveBeenCalled();
});

it('shows loading after a direct request, blocks both buttons and permits direct retry after an error', async () => {
  let reject!: (error: Error) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const { wrapper } = setup({ title: '' });
  const trigger = actionButton(wrapper);
  await trigger.trigger('click');
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(trigger.element.disabled).toBe(true);
  expect(chooser(wrapper).element.disabled).toBe(true);
  expect(trigger.attributes('aria-busy')).toBe('true');
  expect(trigger.get('[role="status"]').text()).toBe('Loading...');
  trigger.element.click();
  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  reject(new Error('Service unavailable'));
  await flushPromises();

  expect(trigger.element.disabled).toBe(false);
  expect(trigger.attributes('aria-busy')).toBe('false');
  expect(trigger.find('[role="status"]').exists()).toBe(false);
  expect(chooser(wrapper).element.disabled).toBe(false);
  expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion Error', body: 'Service unavailable' });
  await trigger.trigger('click');
  await flushPromises();
  expect(multiAnalysis).toHaveBeenCalledTimes(2);
});

it('preserves selected populated overrides for a retry after the request fails', async () => {
  multiAnalysis.mockRejectedValueOnce(new Error('Service unavailable'));
  const { coordinator, wrapper } = setup();
  const suggestAll = vi.spyOn(coordinator, 'suggestAll');
  await chooser(wrapper).trigger('click');
  await wrapper.get('#multi-suggest-title').setValue(true);
  await actionButton(wrapper).trigger('click');
  await flushPromises();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  expect(actionButton(wrapper).element.disabled).toBe(false);
  await actionButton(wrapper).trigger('click');
  await flushPromises();
  expect(suggestAll).toHaveBeenCalledTimes(2);
  expect(suggestAll).toHaveBeenNthCalledWith(1, ['title']);
  expect(suggestAll).toHaveBeenNthCalledWith(2, ['title']);
  expect(multiAnalysis).toHaveBeenCalledTimes(2);
});
