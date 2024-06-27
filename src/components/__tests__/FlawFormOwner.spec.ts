import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import FlawFormOwner from '../FlawFormOwner.vue';
import { mount, VueWrapper } from '@vue/test-utils';
import { useUserStore } from '@/stores/UserStore';

const pinia = createTestingPinia();
const userStore = useUserStore();

vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn((key: string) => {
    return {
      UserStore: {
        value: {
          refresh: 'mocked_refresh_token',
          env: 'mocked_env',
          whoami: {
            email: 'test@example.com',
          },
          jiraUsername: 'skynet',
        },
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


describe('Owner field renders', () => {
  let subject: VueWrapper<InstanceType<typeof FlawFormOwner>>;
  beforeEach(() => {
    userStore.updateJiraUsername = vi.fn(() => Promise.resolve());
    subject = mount(FlawFormOwner, {
      global: {
        plugins: [pinia],
      },
    });
  });
  it('should render the owner field', () => {
    expect(subject.exists()).toBe(true);
  });

  it('assigns the test user when button is clicked', async () => {
    await subject.find('button.osim-self-assign').trigger('click');
    await subject.vm.$nextTick();
    expect(subject.text()).toContain('skynet');
  });
});
