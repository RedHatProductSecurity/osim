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
      })),
      useStorage: vi.fn((key, defaults = {
        bugzillaApiKey: '',
        jiraApiKey: '',
        showNotifications: false,
      }) => ({
        value: defaults,
      })),
    }));

    vi.mock('jwt-decode', () => ({
      default: vi.fn(() => ({
        sub: '1234567890',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
      })),
    }));

    vi.mock('@/stores/osimRuntime', async () => {
      const osimRuntimeValue = {
        env: 'unittest',
        backends: {
          osidb: 'osidb-backend',
          bugzilla: 'bugzilla-backend',
          jira: 'jira-backend',
        },
        osimVersion: {
          rev: 'osimrev', tag: 'osimtag', timestamp: '1970-01-01T00:00:00Z', dirty: true
        },
        error: '',
      };
      return {
        setup: vi.fn(() => { }),
        osimRuntimeStatus: 1,
        osidbHealth: {
          revision: '',
        },
        osimRuntime: {
          value: osimRuntimeValue, // as accessed by <script setup>
          ...osimRuntimeValue, // as accessed by <template>
        },
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
        stubs: {
          ChangeLog: true
        },
        plugins: [
          pinia,
          router
        ]
      }
    });
    const toastContainer = subject.findAllComponents(ToastContainer)?.[0];
    expect(toastContainer?.exists()).toBeTruthy();
  });

  it('renders runtime information', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    subject = mount(App, {
      global: {
        stubs: {
          ChangeLog: true
        },
        plugins: [
          pinia,
          router,
        ],
      },
    });
    const statusBar = subject.find('.osim-status-bar');
    expect(statusBar?.exists()).toBeTruthy();
    expect(statusBar?.text().includes('env: unittest')).toBeTruthy();
    expect(statusBar?.text().includes('tag: osimtag (dirty)')).toBeTruthy();
    expect(statusBar?.text().includes('ts : 1970-01-01')).toBeTruthy();
  });
});
