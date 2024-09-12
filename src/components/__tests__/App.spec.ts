import type { Ref } from 'vue';

import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import App from '@/App.vue';
import { OsimRuntimeStatus, osimRuntimeStatus } from '@/stores/osimRuntime';

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
    (osimRuntimeStatus as Ref<OsimRuntimeStatus>).value = OsimRuntimeStatus.ERROR;
    const wrapper = mountApp();

    expect(wrapper.find('.osim-backend-error').exists()).toBe(true);
    expect(wrapper.find('.osim-content-layered').exists()).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
