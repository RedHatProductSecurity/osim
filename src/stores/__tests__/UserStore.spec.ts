import { describe, it, expect } from 'vitest';
import { useUserStore } from '../UserStore';
import { createPinia, setActivePinia } from 'pinia';
import { getJiraUsername } from '@/services/JiraService';

describe('UserStore', () => {
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    userStore = useUserStore();
    vi.clearAllMocks();
  });

  it('initializes', () => {
    expect(userStore.refresh === '').toBe(true);
    expect(userStore.env === '').toBe(true);
    expect(userStore.whoami === null).toBe(true);
    expect(userStore.jiraUsername === '').toBe(true);
  });
  it('fetches Jira username from Jira API when missing in store', async() => {
    vi.mock('@/services/JiraService', () => ({
      getJiraUsername: vi.fn(() => {
        return new Promise<string>((resolve) => {
          resolve('skynet');
        });
      }),
    }));

    expect(userStore.jiraUsername === '').toBe(true);
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    await userStore.updateJiraUsername();
    expect(getJiraUsername).toHaveBeenCalledTimes(1);
    console.log(userStore.jiraUsername);
    expect(userStore.jiraUsername === 'skynet').toBe(true);
  });
  it('gets Jira username from userstore preferably', async() => {
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    await userStore.updateJiraUsername();
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    expect(userStore.jiraUsername === 'skynet').toBe(true);
  });
});
