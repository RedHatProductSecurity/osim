import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import IndexView from '@/views/IndexView.vue';
import { useFlawsFetching }  from '../../composables/useFlawsFetching';
import LabelCheckbox from '../widgets/LabelCheckbox.vue';

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
      },
      SearchStore: {
        value: {
          searchFilters: { 'affects__ps_component':'test' }
        }
      }
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

vi.mock('../../composables/useFlawsFetching',  () => ({
  useFlawsFetching: vi.fn(() => ({
    issues: [],
    isLoading: false,
    isFinalPageFetched: false,
    loadFlaws: vi.fn(),
    loadMoreFlaws: vi.fn(),
  })),
}));

describe('IndexView', () => {
  let wrapper: VueWrapper<any>;
  const props: typeof IndexView.props = {};

  beforeEach(() => {
    vi.mocked(useFlawsFetching).mockReturnValue({
      issues: [],
      isLoading: false,
      isFinalPageFetched: false,
      loadFlaws: vi.fn(),
      loadMoreFlaws: vi.fn(),
    });
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: true,
    });
    wrapper = mount(IndexView, {
      props,
      global: {
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

  it('should call Load on mounted with default filter', async () => {
    await flushPromises();
    expect(useFlawsFetching().loadFlaws).toHaveBeenCalledOnce();
    expect(useFlawsFetching().loadFlaws.mock.calls[0][0]._value).toStrictEqual({
      'order': '-created_dt',
      'affects__ps_component': 'test'
    });
  });

  it('shoud call without default filter when checkbox off', async () => {
    expect(useFlawsFetching().loadFlaws).toHaveBeenCalledOnce();
    expect(useFlawsFetching().loadFlaws.mock.calls[0][0]._value).toStrictEqual({
      'order': '-created_dt',
      'affects__ps_component': 'test'
    });
    const filterEl = wrapper.find('div.osim-incident-filter');
    expect(filterEl.exists()).toBeTruthy();
    const defaultFilterCheckbox = filterEl.findAllComponents(LabelCheckbox)[2];
    expect(defaultFilterCheckbox.exists()).toBeTruthy();
    await defaultFilterCheckbox.setValue(false);
    await wrapper.vm.$nextTick();
    expect(useFlawsFetching().loadFlaws.mock.calls[1][0]._value).toStrictEqual({
      'order': '-created_dt',
    });
  });
});
