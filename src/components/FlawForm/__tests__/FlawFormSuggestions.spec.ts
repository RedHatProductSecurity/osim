import { nextTick, ref, type Directive, type Ref } from 'vue';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { OsimRuntimeType } from '@/types/zodOsim';
import type { AegisMultiAnalysisResponse } from '@/types/aegisAI';
import { deepCopyFromRaw } from '@/utils/helpers';

import FlawForm from '../FlawForm.vue';

const isSaving = ref(false);
const createFlaw = vi.fn();
const updateFlaw = vi.fn();
const addToast = vi.fn();
vi.mock('@/composables/useFlawModel', () => ({
  useFlawModel: () => ({
    isSaving,
    createFlaw,
    updateFlaw,
    isValid: () => true,
    errors: Object.fromEntries(Object.keys(blankFlaw()).map(field => [field, null])),
    flawReferences: ref([]),
    flawAcknowledgments: ref([]),
    shouldCreateJiraTask: ref(false),
    areLabelsUpdated: ref(false),
    bugzillaLink: 'https://bugzilla.example.com/show_bug.cgi?id=123',
    osimLink: 'https://osim.example.com/flaws/123',
    commentsByType: {},
    internalCommentsAvailable: ref(false),
    isLoadingInternalComments: ref(false),
  }),
}));
vi.mock('@/composables/useFetchFlaw', () => ({
  useFetchFlaw: () => ({
    currentlyFetchedAffectCount: ref(0),
    fetchedAffectsPercentage: ref(0),
    historyFetchError: ref(false),
    isFetchingAffects: ref(false),
    totalAffectCount: ref(0),
  }),
}));
vi.mock('@/composables/useCvssScores', () => ({
  useCvssScores: () => ({
    highlightedNvdCvssString: ref([]),
    nvdCvssString: ref(''),
    rhCvssString: ref(''),
    shouldDisplayEmailNistForm: ref(false),
    wasFlawCvssModified: ref(false),
    reset: vi.fn(),
  }),
}));
vi.mock('@/composables/useAffectsModel', () => ({
  useAffectsModel: () => ({
    state: { removedAffects: new Set(), wereAffectsEditedOrAdded: ref(false) },
    actions: { initializeAffects: vi.fn() },
  }),
}));
vi.mock('@/stores/DraftFlawStore', () => ({ useDraftFlawStore: () => ({ draftFlaw: null }) }));
vi.mock('@/stores/ToastStore', () => ({ useToastStore: () => ({ addToast }) }));
vi.mock('@/services/JiraService', () => ({ jiraTaskUrl: (key: string) => `https://jira.example.com/browse/${key}` }));

const runtime = osimRuntime as Ref<OsimRuntimeType>;
const multiAnalysis = vi.spyOn(AegisAIService.prototype, 'analyzeCVEMultipleFeatures');
const response: AegisMultiAnalysisResponse = {
  results: { 'suggest-description': { suggested_title: 'AI title', suggested_description: 'AI description' } },
  errors: {},
};
const wrappers: ReturnType<typeof shallowMount>[] = [];

function setup(mode: 'create' | 'edit' = 'edit') {
  const wrapper = shallowMount(FlawForm, {
    props: { mode },
    attachTo: document.body,
    global: {
      plugins: [createTestingPinia()],
      directives: { osimLoading: vi.fn() as Directive },
      stubs: { AegisMultiSuggest: false, LoadingSpinner: false },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

function suggestionButton(wrapper: ReturnType<typeof setup>) {
  return wrapper.findAll('button').find(button => button.text().includes('Multi Suggest'))!;
}

function buttonByText(wrapper: ReturnType<typeof setup>, label: string) {
  return wrapper.findAll<HTMLButtonElement>('button').find(button => button.text() === label)!;
}

async function submitAllSuggestions(wrapper: ReturnType<typeof setup>) {
  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  const selectAll = wrapper.find('button[title="Select all"]');
  if (selectAll.exists()) await selectAll.trigger('click');
  const submit = suggestionButton(wrapper);
  expect(submit.attributes('type')).toBe('button');
  submit.element.click();
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  isSaving.value = false;
  multiAnalysis.mockResolvedValue(response);
  useAegisMetadataTracking().setAegisMetadata({});
  runtime.value.flags = { aiTitleSuggestions: true, aiDescriptionSuggestions: true };
  useFlaw().setFlaw({
    ...blankFlaw(),
    cve_id: 'CVE-2024-1234',
    title: 'Original title',
    cve_description: 'Original description',
    created_dt: '2026-09-28T00:00:00Z',
    task_key: 'OSIDB-123',
    meta_attr: { bz_id: '123' },
  });
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

it.each(['create', 'edit'] as const)('requests suggestions without submitting the %s form', async (mode) => {
  const wrapper = setup(mode);
  const button = suggestionButton(wrapper);
  expect(button.attributes('type')).toBe('button');
  button.element.click();
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(button.element.disabled).toBe(true);
  await submitAllSuggestions(wrapper);

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: 'CVE-2024-1234', features: ['suggest-description'], title: 'Original title',
  }));
  expect(useFlaw().flaw.value.title).toBe('AI title');
  expect(useFlaw().flaw.value.cve_description).toBe('AI description');
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
});

it.each(['create', 'edit'] as const)('applies notes locally before the normal %s form submission', async (mode) => {
  const { flaw, isFlawUpdated, setFlaw } = useFlaw();
  const metadata = { steering_notes: 'Existing notes', bot_processed: true, context: { source: 'analyst' } };
  setFlaw({ ...flaw.value, aegis_meta: metadata });
  const wrapper = setup(mode);
  const mainSave = wrapper.get<HTMLButtonElement>('button[type="submit"]');
  const notes = '  Internal only\n分析 🔒\t\n ';
  expect(isFlawUpdated.value).toBe(false);
  if (mode === 'edit') expect(mainSave.element.disabled).toBe(true);

  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  const textarea = wrapper.get<HTMLTextAreaElement>('textarea');
  expect(textarea.element.value).toBe('Existing notes');
  expect(buttonByText(wrapper, 'Save notes').element.disabled).toBe(true);
  await textarea.setValue(notes);
  expect(flaw.value.aegis_meta).toEqual(metadata);
  expect(isFlawUpdated.value).toBe(false);
  if (mode === 'edit') expect(mainSave.element.disabled).toBe(true);

  buttonByText(wrapper, 'Save notes').element.click();
  await nextTick();
  expect(flaw.value.aegis_meta).toEqual({ ...metadata, steering_notes: notes });
  expect(isFlawUpdated.value).toBe(true);
  expect(mainSave.element.disabled).toBe(false);
  expect(buttonByText(wrapper, 'Save notes').element.disabled).toBe(true);
  expect(flaw.value.cve_description).toBe('Original description');
  expect(flaw.value.statement).toBe('');
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
  expect(multiAnalysis).not.toHaveBeenCalled();

  await textarea.setValue('Unapplied draft');
  let submittedMetadata: unknown;
  const save = mode === 'create' ? createFlaw : updateFlaw;
  save.mockImplementationOnce(() => { submittedMetadata = deepCopyFromRaw(flaw.value.aegis_meta); });
  mainSave.element.click();
  await flushPromises();
  expect(save).toHaveBeenCalledTimes(1);
  expect(submittedMetadata).toEqual({ ...metadata, steering_notes: notes });
  expect(textarea.element.value).toBe('Unapplied draft');
});

it('uses applied notes in suggestions and preserves the draft across AI and unrelated metadata changes', async () => {
  const { flaw, setFlaw } = useFlaw();
  setFlaw({ ...flaw.value, aegis_meta: { steering_notes: 'Applied context', bot_processed: true } });
  const wrapper = setup();
  const chooser = wrapper.get('button[aria-label="Choose suggestion fields"]');
  await chooser.trigger('click');
  await wrapper.get('textarea').setValue('Draft context');
  await wrapper.get('#multi-suggest-title').setValue(true);
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();
  expect(multiAnalysis).toHaveBeenNthCalledWith(1, expect.objectContaining({ steering_notes: 'Applied context' }));
  expect(multiAnalysis.mock.calls[0][0]).not.toHaveProperty('aegis_meta');
  expect(flaw.value.title).toBe('AI title');

  await chooser.trigger('click');
  expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Draft context');
  flaw.value.aegis_meta = { ...flaw.value.aegis_meta, bot_processed: false, context: { changed: true } };
  await nextTick();
  expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Draft context');
  await buttonByText(wrapper, 'Save notes').trigger('click');
  await wrapper.get('textarea').setValue('Next unapplied draft');
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();

  expect(multiAnalysis).toHaveBeenCalledTimes(2);
  expect(multiAnalysis).toHaveBeenNthCalledWith(2, expect.objectContaining({ steering_notes: 'Draft context' }));
  expect(flaw.value.aegis_meta).toEqual({
    steering_notes: 'Draft context', bot_processed: false, context: { changed: true },
  });
  await chooser.trigger('click');
  expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Next unapplied draft');
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
});

it('clears only the draft until Save notes explicitly applies an empty string', async () => {
  const { flaw, isFlawUpdated, setFlaw } = useFlaw();
  setFlaw({ ...flaw.value, aegis_meta: { steering_notes: 'Applied context', bot_processed: true } });
  const wrapper = setup();
  const chooser = wrapper.get('button[aria-label="Choose suggestion fields"]');
  await chooser.trigger('click');
  await wrapper.get('#multi-suggest-title').setValue(true);
  buttonByText(wrapper, 'Clear').element.click();
  await nextTick();

  expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('');
  expect(buttonByText(wrapper, 'Clear').element.disabled).toBe(true);
  expect(buttonByText(wrapper, 'Save notes').element.disabled).toBe(false);
  expect(flaw.value.aegis_meta.steering_notes).toBe('Applied context');
  expect(isFlawUpdated.value).toBe(false);
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
  expect(multiAnalysis).not.toHaveBeenCalled();
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();
  expect(multiAnalysis).toHaveBeenNthCalledWith(1, expect.objectContaining({ steering_notes: 'Applied context' }));

  await chooser.trigger('click');
  await buttonByText(wrapper, 'Save notes').trigger('click');
  expect(flaw.value.aegis_meta).toEqual({ steering_notes: '', bot_processed: true });
  expect(buttonByText(wrapper, 'Save notes').element.disabled).toBe(true);
  expect(buttonByText(wrapper, 'Clear').element.disabled).toBe(true);
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();
  expect(multiAnalysis).toHaveBeenNthCalledWith(2, expect.objectContaining({ steering_notes: '' }));
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
});

it.each(['reset', 'reload', 'switch flaw'])('reinitializes a draft on %s even when applied notes are unchanged',
  async (action) => {
    const { flaw, setFlaw } = useFlaw();
    setFlaw({ ...flaw.value, aegis_meta: { steering_notes: 'Saved context' } });
    const wrapper = setup();
    await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
    await wrapper.get('textarea').setValue('Discard this draft');
    flaw.value.title = 'Unrelated local edit';
    await nextTick();
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Discard this draft');

    if (action === 'reset') await buttonByText(wrapper, 'Reset Changes').trigger('click');
    if (action === 'reload') setFlaw({ ...flaw.value, title: 'Reloaded title' });
    if (action === 'switch flaw') setFlaw({ ...flaw.value, uuid: 'another-flaw', cve_id: 'CVE-2024-9999' });
    await nextTick();
    if (!wrapper.find('textarea').exists()) {
      await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
    }

    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Saved context');
    expect(buttonByText(wrapper, 'Save notes').element.disabled).toBe(true);
    expect(createFlaw).not.toHaveBeenCalled();
    expect(updateFlaw).not.toHaveBeenCalled();
    expect(multiAnalysis).not.toHaveBeenCalled();
  });

it.each(['create', 'edit'] as const)('toggles all without requesting or saving the %s form', async (mode) => {
  const wrapper = setup(mode);
  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  const toggle = wrapper.get<HTMLButtonElement>('button[title="Select all"]');
  expect(toggle.attributes('type')).toBe('button');
  toggle.element.click();
  await nextTick();
  expect(wrapper.get<HTMLInputElement>('#multi-suggest-title').element.checked).toBe(true);
  expect(wrapper.get<HTMLInputElement>('#multi-suggest-cve_description').element.checked).toBe(true);
  expect(toggle.attributes('aria-label')).toBe('Unselect all suggestion fields');
  expect(toggle.get('i').classes()).toContain('bi-x');
  expect(suggestionButton(wrapper).element.disabled).toBe(false);

  toggle.element.click();
  await nextTick();
  expect(wrapper.get<HTMLInputElement>('#multi-suggest-title').element.checked).toBe(false);
  expect(wrapper.get<HTMLInputElement>('#multi-suggest-cve_description').element.checked).toBe(false);
  expect(toggle.attributes('aria-label')).toBe('Select all suggestion fields');
  expect(toggle.get('i').classes()).toContain('bi-check-all');
  expect(suggestionButton(wrapper).element.disabled).toBe(true);
  suggestionButton(wrapper).element.click();
  await flushPromises();
  expect(multiAnalysis).not.toHaveBeenCalled();
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
});

it('places the gray Multi Suggest control before the stacked external links in one top-aligned header row', () => {
  const wrapper = setup();
  const header = wrapper.get('.osim-flaw-header-link');
  const button = suggestionButton(wrapper);
  expect(button.classes()).toContain('btn-secondary');
  expect(header.classes()).toEqual(expect.arrayContaining(['align-items-start', 'gap-3']));
  expect(header.classes()).not.toContain('flex-column');
  expect(header.element.children).toHaveLength(2);
  const control = header.get('.dropdown');
  expect(header.element.firstElementChild).toBe(control.element);
  expect(control.element.contains(button.element)).toBe(true);
  expect(control.find('button[aria-label="Choose suggestion fields"]').exists()).toBe(true);
  expect(control.find('a').exists()).toBe(false);

  const links = header.findAll('a');
  const linkGroup = control.element.nextElementSibling;
  expect(linkGroup).toBe(header.element.lastElementChild);
  for (const link of links) expect(linkGroup?.contains(link.element)).toBe(true);
  expect(linkGroup?.contains(header.get('unprocessed-flaw-label-stub').element)).toBe(true);
  expect(links.map(link => link.text())).toEqual(['Open in Bugzilla', 'Open in Jira']);
  expect(links.map(link => link.attributes('href'))).toEqual([
    'https://bugzilla.example.com/show_bug.cgi?id=123', 'https://jira.example.com/browse/OSIDB-123',
  ]);
  expect(links[1].classes()).toContain('d-block');
  expect(wrapper.text()).not.toContain('Full Flaw Suggestions');
});

it.each(['create', 'edit'] as const)('directly suggests empty fields without saving the %s form', async (mode) => {
  const wrapper = setup(mode);
  useFlaw().flaw.value.cve_description = ' \t\n ';
  await nextTick();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();

  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Original title', cve_description: ' \t\n ', features: ['suggest-description'],
  }));
  expect(useFlaw().flaw.value.title).toBe('Original title');
  expect(useFlaw().flaw.value.cve_description).toBe('AI description');
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
});

it('applies a populated override selected in the chooser after closing it without saving the flaw', async () => {
  const wrapper = setup();
  const chooser = wrapper.get('button[aria-label="Choose suggestion fields"]');
  await chooser.trigger('click');
  await wrapper.get('#multi-suggest-title').setValue(true);
  expect(wrapper.get('label[for="multi-suggest-title"]').text()).toBe('Title (override)');
  expect(wrapper.get('label[for="multi-suggest-title"]').classes()).toContain('fst-italic');
  await chooser.trigger('click');
  expect(multiAnalysis).not.toHaveBeenCalled();
  suggestionButton(wrapper).element.click();
  await flushPromises();

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(useFlaw().flaw.value.title).toBe('AI title');
  expect(useFlaw().flaw.value.cve_description).toBe('Original description');
  expect(createFlaw).not.toHaveBeenCalled();
  expect(updateFlaw).not.toHaveBeenCalled();
});

it('hides the button when all AI suggestion flags are disabled and preserves external links', async () => {
  const wrapper = setup();
  runtime.value.flags = {};
  await nextTick();

  expect(suggestionButton(wrapper)).toBeUndefined();
  const links = wrapper.findAll('.osim-flaw-header-link a');
  expect(links.map(link => link.text())).toEqual(['Open in Bugzilla', 'Open in Jira']);
  expect(links.map(link => link.attributes('href'))).toEqual([
    'https://bugzilla.example.com/show_bug.cgi?id=123', 'https://jira.example.com/browse/OSIDB-123',
  ]);
});

it('disables the button for an invalid CVE and while the flaw is saving', async () => {
  const wrapper = setup();
  useFlaw().flaw.value.cve_description = '';
  useFlaw().flaw.value.cve_id = '';
  await nextTick();
  expect(suggestionButton(wrapper).element.disabled).toBe(true);
  suggestionButton(wrapper).element.click();
  expect(multiAnalysis).not.toHaveBeenCalled();

  useFlaw().flaw.value.cve_id = 'CVE-2024-1234';
  isSaving.value = true;
  await nextTick();
  expect(suggestionButton(wrapper).element.disabled).toBe(true);
  suggestionButton(wrapper).element.click();
  expect(multiAnalysis).not.toHaveBeenCalled();
  isSaving.value = false;
  await nextTick();
  expect(suggestionButton(wrapper).element.disabled).toBe(false);
});

it.each(['uuid', 'cve_id'] as const)('resets choices and closes the menu when the flaw %s changes', async (field) => {
  const wrapper = setup();
  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  await wrapper.get('#multi-suggest-title').setValue(true);
  const oldButton = suggestionButton(wrapper).element;
  useFlaw().setFlaw({
    ...useFlaw().flaw.value,
    [field]: field === 'uuid' ? 'new-flaw-uuid' : 'CVE-2024-9999',
    cve_description: '',
  });
  await nextTick();

  expect(suggestionButton(wrapper).element).not.toBe(oldButton);
  expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  expect(wrapper.get<HTMLInputElement>('#multi-suggest-title').element.checked).toBe(false);
  expect(wrapper.get<HTMLInputElement>('#multi-suggest-cve_description').element.checked).toBe(true);
  expect(multiAnalysis).not.toHaveBeenCalled();
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: field === 'cve_id' ? 'CVE-2024-9999' : 'CVE-2024-1234',
  }));
  expect(useFlaw().flaw.value.title).toBe('Original title');
  expect(useFlaw().flaw.value.cve_description).toBe('AI description');
});

it('preserves choices across model replacement for the same flaw and CVE', async () => {
  const wrapper = setup();
  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  await wrapper.get('#multi-suggest-title').setValue(true);
  await wrapper.get('button[aria-label="Choose suggestion fields"]').trigger('click');
  useFlaw().setFlaw({ ...useFlaw().flaw.value, cve_description: '' });
  await nextTick();
  await suggestionButton(wrapper).trigger('click');
  await flushPromises();
  expect(useFlaw().flaw.value.title).toBe('AI title');
  expect(useFlaw().flaw.value.cve_description).toBe('');
});

it('shows an accessible loading state, blocks repeated clicks, and recovers after a failed request', async () => {
  let reject!: (error: Error) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const wrapper = setup();
  const button = suggestionButton(wrapper);
  await submitAllSuggestions(wrapper);

  expect(button.element.disabled).toBe(true);
  expect(button.attributes('aria-busy')).toBe('true');
  expect(button.get('[role="status"]').text()).toBe('Loading...');
  button.element.click();
  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  reject(new Error('Service unavailable'));
  await flushPromises();

  expect(button.element.disabled).toBe(false);
  expect(button.attributes('aria-busy')).toBe('false');
  expect(button.find('[role="status"]').exists()).toBe(false);
  expect(useFlaw().flaw.value.title).toBe('Original title');
  expect(addToast).toHaveBeenCalledWith({ title: 'AI Suggestion Error', body: 'Service unavailable' });
  await submitAllSuggestions(wrapper);
  expect(useFlaw().flaw.value.title).toBe('AI title');
});

it('uses the current flaw after replacing the form model', async () => {
  const wrapper = setup();
  const oldFlaw = useFlaw().flaw.value;
  useFlaw().setFlaw({ ...oldFlaw, cve_id: 'CVE-2024-9999', title: 'Replacement title' });
  await nextTick();
  await submitAllSuggestions(wrapper);

  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: 'CVE-2024-9999', title: 'Replacement title',
  }));
  expect(useFlaw().flaw.value.title).toBe('AI title');
  expect(oldFlaw.title).toBe('Original title');
});
