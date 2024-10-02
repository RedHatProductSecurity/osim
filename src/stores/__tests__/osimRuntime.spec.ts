import { http, HttpResponse } from 'msw';

import { server } from '@/__tests__/setup';

vi.unmock('@/stores/osimRuntime');

describe('osimRuntime', () => {
  const runtime = {
    env: 'unit',
    error: '',
    readOnly: false,
    osimVersion: { rev: '1', tag: '1.0.0', timestamp: '2024-08-29T14:00:00Z' },
    backends: {
      osidb: 'osidb',
      bugzilla: 'bugzilla',
      jira: 'jira',
      errata: 'errata',
      jiraDisplay: 'jiraDisplay',
      osidbAuth: 'credentials',
    },
  };

  const osidbHealth = { env: 'unit', revision: '1', version: '1.0.0' };

  beforeAll(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('/runtime.json', () => HttpResponse.json(runtime)),
      http.get('http://localhost:3000/osidb/osidb/healthy', () => HttpResponse.json(osidbHealth)),
    );
  });

  beforeEach(() => {
    vi.resetModules();
  });

  it('should fetch runtime info', async () => {
    const { osimRuntime, OsimRuntimeStatus, osimRuntimeStatus, setup } = await import('../osimRuntime');

    await setup();

    expect(osimRuntimeStatus.value).toBe(OsimRuntimeStatus.READY);
    expect(osimRuntime.value).toEqual(runtime);
    expect(osidbHealth).toEqual(osidbHealth);
  });

  it('can only be setup once', async () => {
    const { setup } = await import('../osimRuntime');

    await setup();
    await setup();

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('should fetch version from github if not available', async () => {
    const { osimRuntime, OsimRuntimeStatus, osimRuntimeStatus, setup } = await import('../osimRuntime');
    const runtimeWithoutVersion = { ...runtime, osimVersion: { rev: '', tag: '', timestamp: '' } };
    server.use(
      http.get('/runtime.json', () => HttpResponse.json(runtimeWithoutVersion)),
      http.get('https://api.github.com/repos/RedHatProductSecurity/osim/commits/main',
        () => HttpResponse.json({ sha: '1234567' })),
    );

    await setup();

    expect(osimRuntimeStatus.value).toBe(OsimRuntimeStatus.READY);
    expect(osimRuntime.value).toEqual({ ...runtimeWithoutVersion,
      osimVersion: {
        rev: '1234567',
        tag: '[fetched from Github]',
        timestamp: '',
      } });
  });

  it('should set status to ERROR if osidb is not healthy', async () => {
    const { osimRuntime, OsimRuntimeStatus, osimRuntimeStatus, setup } = await import('../osimRuntime');
    server.use(http.get('http://localhost:3000/osidb/osidb/healthy', () => HttpResponse.error()));

    await setup();

    expect(osimRuntimeStatus.value).toBe(OsimRuntimeStatus.ERROR);
    expect(osimRuntime.value.error)
      .toBe('Error getting OSIDB health. Possible deployment misconfiguration. Please try again.');
  });
});
