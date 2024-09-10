import type { App } from 'vue';
import { createApp } from 'vue';

import { createHmac } from 'node:crypto';

const encoding = (str: string) =>
  str.replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

export const encodeJWT = (payload: unknown) => {
  const segments = [
    { typ: 'JWT', alg: 'HS256' },
    payload,
  ].map(segment => JSON.stringify(segment))
    .map(btoa)
    .map(encoding);

  const signature = encoding(
    createHmac('sha256', 'TEST-SECRET')
      .update(segments.join('.'))
      .digest('base64'),
  );

  return segments.concat(signature).join('.');
};

export function withSetup<T>(composable: () => T): [T, App] {
  let result: T;
  const app = createApp({
    setup() {
      result = composable();
      return () => { };
    },
  });
  app.mount(document.createElement('div'));
  return [result!, app];
}
