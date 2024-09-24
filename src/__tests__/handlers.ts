import { http, HttpResponse } from 'msw';
import { DateTime } from 'luxon';

import { osimRuntime } from '@/stores/osimRuntime';

import { encodeJWT } from './helpers';

export const getNextAccessTokenHandler = http.get(`${osimRuntime.value.backends.osidb}/auth/token/refresh`,
  () => HttpResponse.json(encodeJWT({
    token_type: 'access',
    exp: Math.floor(DateTime.fromISO('2024-08-29T11:45:58.000Z').toSeconds()),
    iat: Math.floor(DateTime.fromISO('2024-08-29T11:41:58.000Z').toSeconds()),
    jti: '0000',
    user_id: 1337,
  })));
