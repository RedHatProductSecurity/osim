import { VueWrapper, mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import App from '@/App.vue';
import ToastContainer from '../ToastContainer.vue';

describe('App', async () => {
  let subject: VueWrapper<InstanceType<typeof App>>;
  beforeEach(() => {

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
      useElementBounding: vi.fn(() => ({
        bottom: 1000,
        height: 100,
        top: 100
      }))
    }));

    vi.mock('jwt-decode', () => ({
      default: vi.fn(() => ({
        sub: '1234567890',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
      })),
    }));

    vi.mock('@/stores/osimRuntime', async () => {
      return {
        setup: vi.fn(() => { }),
        osimRuntimeStatus: 1,
        osidbHealth: {},
        osimRuntime: {},
        OsimRuntimeStatus: {
          INIT: 0,
          READY: 1,
          ERROR: 2,
        },
      };
    });

    router.push('/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders ToastContainer', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    subject = mount(App, {
      global: {
        plugins: [
          pinia,
          router
        ]
      }
    });
    const toastContainer = subject.findAllComponents(ToastContainer)?.[0];
    expect(toastContainer?.exists()).toBeTruthy();
  });
});
