import { nextTick, ref, type Ref } from 'vue';

import { flushPromises, shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { OsimRuntimeType } from '@/types/zodOsim';
import type { AegisMultiAnalysisResponse } from '@/types/aegisAI';

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
  }),
}));
vi.mock('@/composables/useAffectsModel', () => ({
  useAffectsModel: () => ({ state: { removedAffects: new Set(), wereAffectsEditedOrAdded: ref(false) } }),
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

function setup(mode: 'create' | 'edit' = 'edit') {
  return shallowMount(FlawForm, {
    props: { mode },
    attachTo: document.body,
    global: {
      plugins: [createTestingPinia()],
      directives: { osimLoading: vi.fn() },
      stubs: { LoadingSpinner: false },
    },
  });
}

function suggestionButton(wrapper: ReturnType<typeof setup>) {
  return wrapper.findAll('button').find(button => button.text().includes('Full Flaw Suggestions'))!;
}

beforeEach(() => {
  vi.clearAllMocks();
  isSaving.value = false;
  multiAnalysis.mockResolvedValue(response);
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

it.each(['create', 'edit'] as const)('requests suggestions without submitting the %s form', async (mode) => {
  const wrapper = setup(mode);
  const button = suggestionButton(wrapper);
  expect(button.attributes('type')).toBe('button');
  button.element.click();
  await flushPromises();

  expect(multiAnalysis).toHaveBeenCalledTimes(1);
  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: 'CVE-2024-1234', features: ['suggest-description'], title: 'Original title',
  }));
  expect(useFlaw().flaw.value.title).toBe('AI title');
  expect(useFlaw().flaw.value.cve_description).toBe('AI description');
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
  const button = suggestionButton(wrapper);
  useFlaw().flaw.value.cve_id = '';
  await nextTick();
  expect(button.element.disabled).toBe(true);
  button.element.click();
  expect(multiAnalysis).not.toHaveBeenCalled();

  useFlaw().flaw.value.cve_id = 'CVE-2024-1234';
  isSaving.value = true;
  await nextTick();
  expect(button.element.disabled).toBe(true);
  button.element.click();
  expect(multiAnalysis).not.toHaveBeenCalled();
  isSaving.value = false;
  await nextTick();
  expect(button.element.disabled).toBe(false);
});

it('shows an accessible loading state, blocks repeated clicks, and recovers after a failed request', async () => {
  let reject!: (error: Error) => void;
  multiAnalysis.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const wrapper = setup();
  const button = suggestionButton(wrapper);
  button.element.click();
  await nextTick();

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
  button.element.click();
  await flushPromises();
  expect(useFlaw().flaw.value.title).toBe('AI title');
});

it('uses the current flaw after replacing the form model', async () => {
  const wrapper = setup();
  const oldFlaw = useFlaw().flaw.value;
  useFlaw().setFlaw({ ...oldFlaw, cve_id: 'CVE-2024-9999', title: 'Replacement title' });
  await nextTick();
  suggestionButton(wrapper).element.click();
  await flushPromises();

  expect(multiAnalysis).toHaveBeenCalledWith(expect.objectContaining({
    cve_id: 'CVE-2024-9999', title: 'Replacement title',
  }));
  expect(useFlaw().flaw.value.title).toBe('AI title');
  expect(oldFlaw.title).toBe('Original title');
});
