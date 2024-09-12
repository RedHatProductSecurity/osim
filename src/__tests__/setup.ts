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

afterEach(() => {
  vi.clearAllMocks();
});
