import { createApp, type App } from 'vue';

import { createHmac } from 'node:crypto';

import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { routes } from '@/router';

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
  app.use(createTestingPinia());
  app.use(router);
  app.mount(document.createElement('div'));
  return [result!, app];
}

const { createRouter, createWebHistory } = await vi.importActual<typeof import('vue-router')>('vue-router');
export const router = createRouter({
  history: createWebHistory(),
  routes,
});
export const mountWithConfig: typeof mount = (originalComponent, options) => mount(originalComponent, {
  ...options,
  global: {
    directives: {
      osimLoading: vi.fn(),
      imask: vi.fn(),
      ...options?.global?.directives,
    },
    plugins: [createTestingPinia(), router],
  },
});
