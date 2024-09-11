import { setupServer } from 'msw/node';

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
    osimRuntime: ref({
      readOnly: false,
      env: 'test',
      osimVersion: { rev: '1', tag: '1.0.0', timestamp: new Date('2024-08-29T14:00:00Z').toISOString() },
      error: 'OSIDB is not ready',
      backends: {
        osidb: '',
        osidbAuth: 'credentials',
        bugzilla: '',
        jira: '',
        errata: '',
        jiraDisplay: '',
      },
    }),
  });
});

// By default, MSW will log a warning for unhandled requests.
// This way we can catch them and fail the test.
const onUnhandledRequest = vi.fn().mockImplementation((req: Request) => {
  console.error(`Network request for "${req.url.toString()}" was not handled.`);
});
export const server = setupServer();

beforeAll(() => {
  server.listen({
    onUnhandledRequest,
  });
});

afterEach(() => {
  // Ensure that there are no unhandled requests
  expect(onUnhandledRequest).toHaveBeenCalledTimes(0);

  // Reset any runtime handlers tests may setup
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});
