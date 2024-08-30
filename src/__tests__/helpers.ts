import { createHmac } from 'crypto';

export const encodeJWT = (payload: unknown) => {
  const encoding = (str: string) =>
    str.replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const segments = [
    { typ: 'JWT', alg: 'HS256' },
    payload
  ].map((segment) => JSON.stringify(segment))
    .map(btoa)
    .map(encoding);

  const signature = encoding(
    createHmac('sha256', 'TEST-SECRET')
      .update(segments.join('.'))
      .digest('base64')
  );

  return segments.concat(signature).join('.');
};
