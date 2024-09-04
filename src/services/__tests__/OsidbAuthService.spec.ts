import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { getNextAccessToken } from '../OsidbAuthService';
import { createPinia, setActivePinia } from 'pinia';
import { DateTime } from 'luxon';
import { useUserStore } from '@/stores/UserStore';
import { encodeJWT } from '@/__tests__/helpers';



describe('OsidbAuthService', () => {
  const accessJWT = encodeJWT({
    'token_type': 'access',
    'exp': Math.floor(DateTime.fromISO('2024-08-29T11:45:58.000Z').toSeconds()),
    'iat': Math.floor(DateTime.fromISO('2024-08-29T11:41:58.000Z').toSeconds()),
    'jti': '0000',
    'user_id': 1337
  });

  const refreshEndpoint = http.post('/auth/token/refresh', () => {
    return HttpResponse.json({ access: accessJWT });
  });

  const server = setupServer(refreshEndpoint);

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  beforeEach(() => {
    setActivePinia(createPinia());

    vi.useFakeTimers({
      now: new Date('2024-08-29T11:42:58.000Z')
    });
  });

  afterAll(() => server.close());

  afterEach(() => {
    server.restoreHandlers();
    vi.clearAllTimers();
    vi.useRealTimers();
  });


  it('Should get access token', async () => {
    const token = await getNextAccessToken();

    expect(refreshEndpoint.isUsed).toBeTruthy();
    expect(token).toEqual(accessJWT);
  });

  it('Should use cached access token', async () => {
    const accessToken = encodeJWT({
      'token_type': 'access',
      'exp': Math.floor(DateTime.fromISO('2024-08-29T11:45:58.000Z').toSeconds()),
      'iat': Math.floor(DateTime.fromISO('2024-08-29T11:42:58.000Z').toSeconds()),
      'jti': '1111',
      'user_id': 1337
    });
    const userStore = useUserStore();
    userStore.accessToken = accessToken;

    const token = await getNextAccessToken();

    expect(refreshEndpoint.isUsed).toBeFalsy();
    expect(token).toEqual(accessToken);
  });

  it('Should refresh expired access token', async () => {
    const expiredAccessJWT = encodeJWT({
      'token_type': 'access',
      'exp': Math.floor(DateTime.fromISO('2024-08-29T11:47:58.000Z').toSeconds()),
      'iat': Math.floor(DateTime.fromISO('2024-08-29T11:42:58.000Z').toSeconds()),
      'jti': '0000',
      'user_id': 1337
    });
    const userStore = useUserStore();
    userStore.accessToken = expiredAccessJWT;

    vi.advanceTimersByTime(4 * 60 * 1000);
    const token = await getNextAccessToken();

    expect(token).toEqual(accessJWT);
    expect(refreshEndpoint.isUsed).toBeTruthy();
  });
});
