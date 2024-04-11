import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { useRoute } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import FlawSearchView from '@/views/FlawSearchView.vue';
import { useFlaws }  from '../../composables/useFlaws';

vi.mock('@vueuse/core', () => ({
  useSessionStorage: vi.fn(() => ({
    value: {
      refresh: 'mocked_refresh_token',
      env: 'mocked_env',
      whoami: {
        email: 'test@example.com',
        username: 'testuser',
      },
    },
  })),
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
  return {
    // eslint-disable-next-line @typescript-eslint/ban-types
    ...actual as {},
    useRoute: vi.fn(),
  };
});

vi.mock('../../composables/useFlaws', () => ({
  useFlaws: vi.fn(() => ({
    issues: [],
    isLoading: false,
    isFinalPageFetched: false,
    loadFlaws: vi.fn(),
    loadMoreFlaws: vi.fn(),
  })),
}));


(useRoute as Mock).mockReturnValue({
  'query': { query: 'search', mode: 'advanced' },
});

describe('FlawSearchView', () => {
  let wrapper: VueWrapper<any>;
  const props: typeof FlawSearchView.props = {};

  beforeEach(() => {
    vi.mocked(useFlaws).mockReturnValue({
      issues: [],
      isLoading: false,
      isFinalPageFetched: false,
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
    expect(useFlaws().loadFlaws).toHaveBeenCalledTimes(2);
    expect(useFlaws().loadFlaws.mock.calls[1][0]._value).toStrictEqual({
      'acknowledgments__name': 'test',
      'order': '-created_dt',
      'search': 'search',
    });
  });
});
