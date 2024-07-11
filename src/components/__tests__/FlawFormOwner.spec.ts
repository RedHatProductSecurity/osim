import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import FlawFormOwner from '../FlawFormOwner.vue';
import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { useUserStore } from '@/stores/UserStore';
import { searchJiraUsers } from '@/services/JiraService';

const pinia = createTestingPinia();
const userStore = useUserStore();

vi.mock('@vueuse/core', async (originalImport) => ({
  ... (await originalImport<typeof import('@vueuse/core')>()),
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

vi.mock('@/services/JiraService', () => ({
  searchJiraUsers: vi.fn(() => Promise.resolve([])),
}));

vi.mock('jwt-decode', () => ({
  default: vi.fn(() => ({
    sub: '1234567890',
    name: 'Test User',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  })),
}));


describe('Owner field', () => {
  let subject: VueWrapper<InstanceType<typeof FlawFormOwner>>;
  beforeEach(() => {
    vi.useFakeTimers();
    userStore.updateJiraUsername = vi.fn(() => Promise.resolve());
    subject = mount(FlawFormOwner, {
      global: {
        plugins: [pinia],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should render the owner field', () => {
    expect(subject.exists()).toBe(true);
  });

  it('assigns the test user when button is clicked', async () => {
    await subject.find('button.osim-self-assign').trigger('click');
    await subject.vm.$nextTick();
    expect(subject.text()).toContain('skynet');
  });

  it('should call "searchJiraUsers" when input changes', async () => {
    const input = subject.find('input');
    await input.setValue('test');

    await vi.runAllTimers();

    expect(searchJiraUsers).toHaveBeenCalled();
  });

  it('should show results when input changes', async () => {
    vi.mocked(searchJiraUsers, { partial: true }).mockResolvedValueOnce({
      data: {
        users:
          [{ name: 'test', displayName: 'Test User', html: 'Test User' }]
      }
    });
    const input = subject.find('input');
    await input.setValue('test');

    await vi.runAllTimers();
    await flushPromises();

    expect(subject.text()).toContain('Test User');
  });
});
