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
    isLoading: true,
    isFinalPageFetched: false,
    loadFlaws: vi.fn(),
    loadMoreFlaws: vi.fn(),
  })),
}));


(useRoute as Mock).mockReturnValue({
  'query': { query: 'search' },
});

describe('FlawSearchView', () => {
  let wrapper: VueWrapper<any>;
  const props: typeof FlawSearchView.props = {};

  beforeEach(() => {
    vi.mocked(useFlaws).mockReturnValue({
      issues: [],
      isLoading: true,
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
  });
});
