import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import { encodeJWT } from '@/__tests__/helpers';
import { useAuthStore } from '@/stores/AuthStore';

import { useSessionWarning } from '../useSessionWarning';

// Mock osimRuntime before importing anything else
vi.mock('@/stores/osimRuntime', () => ({
  osimRuntime: {
    value: {
      backends: {
        osidbAuth: 'kerberos',
      },
    },
  },
}));

// Mock UserStore with proper reactive session
const mockSessionData = {
  refresh: '',
  env: '',
  whoami: null,
  jiraUsername: '',
};

// Create a shared login spy that can be accessed in tests
const mockLogin = vi.fn().mockResolvedValue(true);

vi.mock('@/stores/AuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    get refreshToken() { return mockSessionData.refresh as any; },
    set refreshToken(value: string) { mockSessionData.refresh = value; },
    login: mockLogin,
    logout: vi.fn(),
  })),
}));

describe('useSessionWarning', () => {
  let _authStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers({
      now: new Date('2024-01-01T12:00:00Z'),
    });

    // Reset mock data
    mockSessionData.refresh = '';
    mockSessionData.env = '';
    mockSessionData.whoami = null;
    mockSessionData.jiraUsername = '';

    _authStore = useAuthStore();
    vi.clearAllMocks();
    mockLogin.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should detect when refresh token expires in less than 1 hour', () => {
    const { isAccessTokenExpiringInOneHour } = useSessionWarning();

    // Create refresh token that expires in 30 minutes
    mockSessionData.refresh = encodeJWT({
      exp: Math.floor(DateTime.now().plus({ minutes: 30 }).toSeconds()),
      iat: Math.floor(DateTime.now().toSeconds()),
    });

    expect(isAccessTokenExpiringInOneHour.value).toBe(true);
  });

  it('should not detect expiration when refresh token expires in more than 1 hour', () => {
    const { isAccessTokenExpiringInOneHour } = useSessionWarning();

    // Create refresh token that expires in 2 hours
    mockSessionData.refresh = encodeJWT({
      exp: Math.floor(DateTime.now().plus({ hours: 2 }).toSeconds()),
      iat: Math.floor(DateTime.now().toSeconds()),
    });

    expect(isAccessTokenExpiringInOneHour.value).toBe(false);
  });

  it('should not detect expiration when refresh token is already expired', () => {
    const { isAccessTokenExpiringInOneHour } = useSessionWarning();

    // Create refresh token that expired 1 hour ago
    mockSessionData.refresh = encodeJWT({
      exp: Math.floor(DateTime.now().minus({ hours: 1 }).toSeconds()),
      iat: Math.floor(DateTime.now().minus({ hours: 2 }).toSeconds()),
    });

    expect(isAccessTokenExpiringInOneHour.value).toBe(false);
  });

  it('should return correct time until refresh token expiration', () => {
    const { timeUntilExpiration } = useSessionWarning();

    // Create refresh token that expires in 45 minutes
    mockSessionData.refresh = encodeJWT({
      exp: Math.floor(DateTime.now().plus({ minutes: 45 }).toSeconds()),
      iat: Math.floor(DateTime.now().toSeconds()),
    });

    const timeRemaining = timeUntilExpiration.value;
    expect(timeRemaining).toBeDefined();
    expect(timeRemaining?.hours).toBe(0);
    expect(Math.floor(timeRemaining?.minutes || 0)).toBe(45);
  });

  it('should return null for time remaining when no refresh token', () => {
    const { timeUntilExpiration } = useSessionWarning();

    mockSessionData.refresh = '';

    expect(timeUntilExpiration.value).toBeNull();
  });

  it('should handle invalid refresh tokens gracefully', () => {
    const { isAccessTokenExpiringInOneHour, timeUntilExpiration } = useSessionWarning();

    mockSessionData.refresh = 'invalid-token';

    expect(isAccessTokenExpiringInOneHour.value).toBe(false);
    expect(timeUntilExpiration.value).toBeNull();
  });

  it('should call reauthenticate function correctly', async () => {
    const { isReauthenticating, reauthenticate } = useSessionWarning();

    expect(isReauthenticating.value).toBe(false);

    const promise = reauthenticate();
    expect(isReauthenticating.value).toBe(true);

    await promise;
    expect(isReauthenticating.value).toBe(false);
    expect(mockLogin).toHaveBeenCalled();
  });
});
