import { enableAutoUnmount } from '@vue/test-utils';
import { setupServer } from 'msw/node';

import type { OsimRuntime } from '@/stores/osimRuntime';

vi.mock('@/stores/osimRuntime', async (importOriginal) => {
  const { ref } = await import('vue');
  const osimRuntime = await importOriginal<typeof import('@/stores/osimRuntime')>();

  return ({
    OsimRuntimeStatus: osimRuntime.OsimRuntimeStatus,
    setup: vi.fn(),
    osimRuntimeStatus: ref(osimRuntime.OsimRuntimeStatus.READY),
    osidbHealth: ref({
      env: 'test',
      revision: '1',
      version: '1.0.0',
    }),
    osimRuntime: ref<OsimRuntime>({
      readOnly: false,
      env: 'test',
      osimVersion: { rev: '1', tag: '1.0.0', timestamp: new Date('2024-08-29T14:00:00Z').toISOString() },
      error: 'OSIDB is not ready',
      backends: {
        osidb: 'http://localhost:3000',
        osidbAuth: 'credentials',
        bugzilla: '',
        jira: '',
        errata: '',
        jiraDisplay: '',
        mitre: '',
      },
    }),
  });
});

// Automatically unmount components after each test
enableAutoUnmount(afterEach);

// By default, MSW will log a warning for unhandled requests.
// This way we can catch them and fail the test.
const onUnhandledRequest = vi.fn().mockImplementation((req: Request) => {
  console.log(`Network request for "${req.method}: ${req.url.toString()}" was not handled.`);
});
export const server = setupServer();

vi.spyOn(console, 'warn').mockImplementation((...msg) => {
  const warning = msg.join(' ');
  console.trace(warning);
  assert.fail(warning);
});

vi.spyOn(console, 'error').mockImplementation((...msg) => {
  const error = msg.join(' ');
  console.debug(error);
  assert.fail(error);
});

beforeAll(() => {
  server.listen({
    onUnhandledRequest,
  });
});

afterEach(() => {
  // Ensure that there are no unhandled requests
  expect(onUnhandledRequest).toHaveBeenCalledTimes(0);

  // Restore any runtime handlers tests may setup
  server.restoreHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
  vi.restoreAllMocks();
  vi.resetModules();
});
