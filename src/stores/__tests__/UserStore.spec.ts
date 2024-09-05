import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import { getJiraUsername } from '@/services/JiraService';
import { encodeJWT } from '@/__tests__/helpers';

import { useUserStore } from '../UserStore';

describe('userStore', () => {
  let userStore: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers({
      now: new Date('2024-01-01T00:00:00Z'),
    });

    userStore = useUserStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes', () => {
    expect(userStore.refresh === '').toBe(true);
    expect(userStore.env === '').toBe(true);
    expect(userStore.whoami === null).toBe(true);
    expect(userStore.jiraUsername === '').toBe(true);
  });

  it('fetches Jira username from Jira API when missing in store', async () => {
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
    expect(userStore.jiraUsername === 'skynet').toBe(true);
  });

  it('gets Jira username from userstore preferably', async () => {
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    await userStore.updateJiraUsername();
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    expect(userStore.jiraUsername === 'skynet').toBe(true);
  });

  it('should set `isAccessTokenExpired` to true when access token is undefined', () => {
    userStore.accessToken = undefined;
    expect(userStore.isAccessTokenExpired()).toBe(true);
  });

  it('should set `isAccessTokenExpired` to true when access token is about to expire', () => {
    userStore.accessToken = encodeJWT({
      token_type: 'access',
      exp: Math.floor(DateTime.now().minus({ minutes: 1 }).toSeconds()),
      iat: Math.floor(DateTime.now().toSeconds()),
      jti: '0000',
      user_id: 1337,
    });

    expect(userStore.isAccessTokenExpired()).toBe(true);
  });

  it('should set `isAccessTokenExpired` to false when access token is active', () => {
    userStore.accessToken = encodeJWT({
      token_type: 'access',
      exp: Math.floor(DateTime.now().plus({ minutes: 5 }).toSeconds()),
      iat: Math.floor(DateTime.now().toSeconds()),
      jti: '0000',
      user_id: 1337,
    });

    expect(userStore.isAccessTokenExpired()).toBe(false);
  });

  it('should not throw when access token is invalid', () => {
    expect(() => {
      userStore.accessToken = 'invalid';

      expect(userStore.isAccessTokenExpired()).toBe(true);
    }).not.toThrow();
  });
});
