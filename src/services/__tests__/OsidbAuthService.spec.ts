import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import { useAuthStore } from '@/stores/AuthStore';
import { encodeJWT } from '@/__tests__/helpers';
import { server } from '@/__tests__/setup';

import { getNextAccessToken } from '../OsidbAuthService';

describe('osidbAuthService', () => {
  const accessJWT = encodeJWT({
    token_type: 'access',
    exp: Math.floor(DateTime.fromISO('2024-08-29T11:45:58.000Z').toSeconds()),
    iat: Math.floor(DateTime.fromISO('2024-08-29T11:41:58.000Z').toSeconds()),
    jti: '0000',
    user_id: 1337,
  });

  const refreshEndpoint = http.get('/auth/token/refresh', () => {
    return HttpResponse.json({ access: accessJWT });
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    server.use(refreshEndpoint);

    vi.useFakeTimers({
      now: new Date('2024-08-29T11:42:58.000Z'),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  afterAll(() => server.close());

  it('should get access token', async () => {
    const token = await getNextAccessToken();

    expect(refreshEndpoint.isUsed).toBeTruthy();
    expect(token).toEqual(accessJWT);
  });

  it('should use cached access token', async () => {
    const accessToken = encodeJWT({
      token_type: 'access',
      exp: Math.floor(DateTime.fromISO('2024-08-29T11:45:58.000Z').toSeconds()),
      iat: Math.floor(DateTime.fromISO('2024-08-29T11:42:58.000Z').toSeconds()),
      jti: '1111',
      user_id: 1337,
    });
    const authStore = useAuthStore();
    authStore.accessToken = accessToken;

    const token = await getNextAccessToken();

    expect(token).toEqual(accessToken);
  });

  it('should refresh expired access token', async () => {
    const expiredAccessJWT = encodeJWT({
      token_type: 'access',
      exp: Math.floor(DateTime.fromISO('2024-08-29T11:47:58.000Z').toSeconds()),
      iat: Math.floor(DateTime.fromISO('2024-08-29T11:42:58.000Z').toSeconds()),
      jti: '0000',
      user_id: 1337,
    });
    const authStore = useAuthStore();
    authStore.accessToken = expiredAccessJWT;

    vi.advanceTimersByTime(4 * 60 * 1000);
    const token = await getNextAccessToken();

    expect(token).toEqual(accessJWT);
    expect(refreshEndpoint.isUsed).toBeTruthy();
  });
});
