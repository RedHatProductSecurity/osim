import type { Ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import App from '@/App.vue';
import { OsimRuntimeStatus, osimRuntimeStatus } from '@/stores/osimRuntime';

describe('App', async () => {
  vi.mock('@/stores/osimRuntime', async (importOriginal) => {
    const { ref } = await import('vue');
    const osimRuntime = await importOriginal<typeof import('@/stores/osimRuntime')>();

    return {
      ...osimRuntime,
      setup: vi.fn(),
      osimRuntimeStatus: ref(osimRuntime.OsimRuntimeStatus.READY),
      osimRuntime: ref({
        readOnly: false,
        env: 'dev',
        osimVersion: { rev: '1', tag: '1.0.0', timestamp: '2024-08-29' },
        error: 'OSIDB is not ready',
        backends: {}
      }),
    };
  });

  const mountApp = () => shallowMount(App, {
    global: {
      plugins: [createTestingPinia()],
      mocks: {
        $route: {
          meta: {}
        }
      },
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('Renders the App component when OSIDB is READY', () => {
    const wrapper = mountApp();

    expect(wrapper.find('.osim-content-layered').exists()).toBe(true);
    expect(wrapper.find('.osim-status-bar').exists()).toBe(true);
    expect(wrapper.find('.osim-backend-error').exists()).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('Renders the App component when OSIDB is NOT READY', () => {
    (osimRuntimeStatus as Ref<OsimRuntimeStatus>).value = OsimRuntimeStatus.ERROR;
    const wrapper = mountApp();

    expect(wrapper.find('.osim-backend-error').exists()).toBe(true);
    expect(wrapper.find('.osim-content-layered').exists()).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
