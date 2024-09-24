import { describe, it, expect } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DateTime } from 'luxon';
import { http, HttpResponse } from 'msw';

import { getJiraUsername } from '@/services/JiraService';
import { encodeJWT } from '@/__tests__/helpers';
import { server } from '@/__tests__/setup';

import { useUserStore } from '../UserStore';
import { osimRuntime } from '../osimRuntime';

describe('userStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers({
      now: new Date('2024-01-01T00:00:00Z'),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes', () => {
    const userStore = useUserStore();
    expect(userStore.refresh === '').toBe(true);
    expect(userStore.env === '').toBe(true);
    expect(userStore.whoami === null).toBe(true);
    expect(userStore.jiraUsername === '').toBe(true);
  });

  it('fetches Jira username from Jira API when missing in store', async () => {
    const userStore = useUserStore();
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
    const userStore = useUserStore();
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    await userStore.updateJiraUsername();
    expect(getJiraUsername).toHaveBeenCalledTimes(0);
    expect(userStore.jiraUsername === 'skynet').toBe(true);
  });

  it('should set `isAccessTokenExpired` to true when access token is undefined', () => {
    const userStore = useUserStore();
    userStore.accessToken = undefined;
    expect(userStore.isAccessTokenExpired()).toBe(true);
  });

  it('should set `isAccessTokenExpired` to true when access token is about to expire', () => {
    const userStore = useUserStore();
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
    const userStore = useUserStore();
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
    vi.spyOn(console, 'debug').mockImplementation(() => void 0);
    const userStore = useUserStore();

    expect(() => {
      userStore.accessToken = 'invalid';

      expect(userStore.isAccessTokenExpired()).toBe(true);
    }).not.toThrow();
  });

  it('should store token in local storage', async () => {
    const jwt = encodeJWT({
      token_type: 'access',
      exp: Math.floor(DateTime.fromISO('2024-08-29T11:45:58.000Z').toSeconds()),
      iat: Math.floor(DateTime.fromISO('2024-08-29T11:41:58.000Z').toSeconds()),
      jti: '0000',
      user_id: 1337,
    });
    const whoami = {
      email: 'test@redhat.com',
      groups: ['test'],
      username: 'skynet',
    };
    server.use(
      http.post(`${osimRuntime.value.backends.osidb}/auth/token`, () => HttpResponse.json({
        access: jwt,
        refresh: jwt,
        env: 'unit',
      })),
      http.get(`${osimRuntime.value.backends.osidb}/osidb/whoami`, () => HttpResponse.json(whoami)),
    );

    const userStore = useUserStore();
    await userStore.login('skynet', 'terminator');

    const storage = JSON.parse(localStorage.getItem('UserStore') || '');
    expect(storage).toBeInstanceOf(Object);
    expect(storage).toHaveProperty('refresh', jwt);
    expect(storage).toHaveProperty('env', 'unit');
    expect(storage).toHaveProperty('whoami', whoami);
  });
});
