import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import App from '@/App.vue';
import { osimRuntimeStatus } from '@/stores/osimRuntime';
import { OsimRuntimeStatus } from '@/types/zodOsim';

const mountApp = () => shallowMount(App, {
  global: {
    plugins: [createTestingPinia()],
    mocks: {
      $route: {
        meta: {},
      },
    },
  },
});

describe('app', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the App component when OSIDB is READY', () => {
    const wrapper = mountApp();

    expect(wrapper.find('.osim-content-layered').exists()).toBe(true);
    expect(wrapper.find('.osim-status-bar').exists()).toBe(true);
    expect(wrapper.find('.osim-backend-error').exists()).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders the App component when OSIDB is NOT READY', () => {
    vi.mocked(osimRuntimeStatus).value = OsimRuntimeStatus.ERROR;

    const wrapper = mountApp();

    expect(wrapper.find('.osim-backend-error').exists()).toBe(true);
    expect(wrapper.find('.osim-content-layered').exists()).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
