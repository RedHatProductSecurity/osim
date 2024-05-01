import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { useRoute, useRouter } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import FlawSearchView from '@/views/FlawSearchView.vue';
import { useFlaws }  from '../../composables/useFlaws';
import { useSearchStore } from '@/stores/SearchStore';
import { useToastStore } from '@/stores/ToastStore';

vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn((key: string, defaults) => {
    return {
      UserStore: {
        value: defaults || {
          // Set your fake user data here
          refresh: 'mocked_refresh_token',
          env: 'mocked_env',
          whoami: {
            email: 'test@example.com',
            username: 'testuser',
          },
        },
        SearchStore: {
          value: defaults || {
            searchFilters: { 'test':'test' }
          }
        }
      },
    }[key];
  }),
  useStorage: vi.fn((key: string, defaults) => {
    return {
      'OSIM::API-KEYS': {
        value: defaults || {
          bugzillaApiKey: '',
          jiraApiKey: '',
          showNotifications: false,
        },
      },
    }[key];
  }),
}));

vi.mock('jwt-decode', () => ({
  default: vi.fn(() => ({
    sub: '1234567890',
    name: 'Test User',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  })),
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  const replaceMock = vi.fn();
  
  return {
    ...actual,
    useRoute: vi.fn(() => ({ query: { mode: 'advanced', query: 'search' } })),
    useRouter: vi.fn(() => ({
      replace: replaceMock
    }))
  };
});

vi.mock('../../composables/useFlaws',  () => ({
  useFlaws: vi.fn(() => ({
    issues: [],
    isLoading: false,
    isFinalPageFetched: false,
    total:0,
    loadFlaws: vi.fn(),
    loadMoreFlaws: vi.fn(),
  })),
}));

describe('FlawSearchView', () => {
  let wrapper: VueWrapper<any>;
  const props: typeof FlawSearchView.props = {};

  beforeEach(() => {
    vi.mocked(useFlaws).mockReturnValue({
      issues: [],
      isLoading: false,
      isFinalPageFetched: false,
      total:0,
      loadFlaws: vi.fn(),
      loadMoreFlaws: vi.fn(),
    });
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    wrapper = mount(FlawSearchView, {
      props,
      global: {
        mocks: { useRoute },
        plugins:[pinia]
      }
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it('should render', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should call Load on mounted', async () => {
    await flushPromises();
    expect(useFlaws().loadFlaws).toHaveBeenCalledOnce();
    expect(useFlaws().loadFlaws.mock.calls[0][0]._value).toStrictEqual({
      'order': '-created_dt',
      'search': 'search',
    });
  });

  it('should call loadFlaws on search', async () => {
    await flushPromises();
    expect(useFlaws().loadFlaws).toHaveBeenCalledOnce();
    const selectDropdown = wrapper.find('select.form-select.search-facet-field');
    await selectDropdown.setValue(selectDropdown.findAll('option')[1].element.value);
    await selectDropdown.trigger('change');
    const inputField = wrapper.find('input.form-control');
    await inputField.setValue('test'); 
    const searchButton = wrapper.find('button[type="submit"]');
    expect(searchButton.exists()).toBeTruthy();
    await searchButton.trigger('submit');
    await flushPromises();
    expect(useRouter().replace).toHaveBeenCalled();
    expect(useRouter().replace.mock.calls[0][0])
      .toStrictEqual({ query: { query: 'search', acknowledgments__name: 'test' } });
  });
  
  it('should call saveFilter on save filter button click', async () => {
    (useRoute as Mock).mockReturnValue({
      'query': { 
        mode: 'advanced', 
        query: 'search',
        'affects__ps_component': 'test'
      },
    });
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: true,
    });
    wrapper = mount(FlawSearchView, {
      props,
      global: {
        mocks: { useRoute },
        plugins:[pinia]
      }
    });
    const searchStore = useSearchStore();
    const toastStore = useToastStore();
    const saveButton = wrapper.find('button[type="button"].btn-primary.me-3');
    expect(saveButton.exists()).toBeTruthy();
    expect(saveButton.text()).toBe('Save as Default');
    await saveButton.trigger('click');
    await flushPromises();
    expect(searchStore.saveFilter).toHaveBeenCalledOnce();
    expect(searchStore.saveFilter.mock.calls[0][0]).toStrictEqual({ 'affects__ps_component': 'test' });
    expect(toastStore.addToast).toHaveBeenCalledOnce();
  });

  it('should call with correct filters from route on mounted', async () => {
    (useRoute as Mock).mockReturnValue({
      'query': { 
        mode: 'advanced', 
        query: 'search',
        'affects__ps_component': 'test'
      },
    });
    await flushPromises();
    expect(useFlaws().loadFlaws).toHaveBeenCalledOnce();
    expect(useFlaws().loadFlaws.mock.calls[0][0]._value).toStrictEqual({ 'affects__ps_component': 'test',
      'order': '-created_dt',
      'search': 'search',
    });
  });
});
