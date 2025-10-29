import { createApp, type App, type Plugin } from 'vue';

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

export function withSetup<T>(setupFn: (() => T), plugins: Plugin[] = [router]): [T, App] {
  let result: T;

  const app = createApp({
    setup() {
      try {
        result = setupFn();
      } catch (error) {
        console.trace(error);
        throw error;
      }
      return () => {};
    },
  });
  for (const plugin of plugins) {
    app.use(plugin);
  }
  app.mount(document.createElement('div'));
  return [result!, app];
}

const { createRouter, createWebHistory } = await vi.importActual<typeof import('vue-router')>('vue-router');
export const router = createRouter({
  history: createWebHistory(),
  routes,
});

type MountConfig = {
  <Component>(
    originalComponent: Component,
    options?: Record<string, any>,
    plugins?: Plugin[],
  ): ReturnType<typeof mount<Component>>;
};

export const mountWithConfig: MountConfig = (
  originalComponent,
  options,
  plugins?: Plugin[],
) => mount(originalComponent, {
  ...options,
  global: {
    ...options?.global,
    directives: {
      osimLoading: vi.fn(),
      imask: vi.fn(),
      resizableTableColumns: vi.fn(),
      ...options?.global?.directives,
    },
    plugins: plugins ?? [createTestingPinia(), router],
  },
});

export const createMouseEvent = (type: string, clientX: number) => {
  return new MouseEvent(type, { clientX, bubbles: true, cancelable: true });
};

export async function importActual(path: string) {
  const imported = import(path);
  await vi.dynamicImportSettled();
  type Imported = Awaited<typeof imported>;
  return vi.importActual<Imported>(path);
}
