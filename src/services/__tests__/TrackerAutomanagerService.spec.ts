import { http, HttpResponse } from 'msw';

import { server } from '@/__tests__/setup';
import { osimRuntime } from '@/stores/osimRuntime';

import { getTrackerAutomanagerStatus } from '../TrackerAutomanagerService';

const baseUrl = 'http://tracker-automanager:8006';
const flawUuid = '734e9a1a-80d9-4ff5-a5b9-e2214da66dc0';
const record = {
  ps_update_stream: 'stream',
  ps_module: 'module',
  ps_component: 'component',
  status: 'scheduled',
  failure_reason: null,
  external_system_id: null,
};

describe('trackerAutomanagerService', () => {
  beforeEach(() => {
    (osimRuntime as any).value.backends.trackerAutomanager = baseUrl;
  });

  afterEach(() => {
    (osimRuntime as any).value.backends.trackerAutomanager = '';
  });

  it('requests the configured endpoint with browser credentials and validates statuses', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    server.use(http.get(`${baseUrl}/tracker_automanager/api/v1/flaws/:id/trackers`, () =>
      HttpResponse.json({
        flaw_uuid: flawUuid,
        trackers: ['scheduled', 'running', 'created', 'failed', 'retrying'].map(status => ({ ...record, status })),
      }),
    ));

    const result = await getTrackerAutomanagerStatus(flawUuid);
    expect(result.trackers.map(item => item.status)).toEqual(['scheduled', 'running', 'created', 'failed', 'retrying']);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/tracker_automanager/api/v1/flaws/${flawUuid}/trackers`,
      expect.objectContaining({ credentials: 'include', mode: 'cors' }),
    );
  });

  it('accepts empty results and nullable fields', async () => {
    server.use(http.get(`${baseUrl}/tracker_automanager/api/v1/flaws/:id/trackers`, () =>
      HttpResponse.json({ flaw_uuid: flawUuid, trackers: [{ ...record, status: 'failed' }] }),
    ));
    expect((await getTrackerAutomanagerStatus(flawUuid)).trackers[0].failure_reason).toBeNull();
    server.use(http.get(`${baseUrl}/tracker_automanager/api/v1/flaws/:id/trackers`, () =>
      HttpResponse.json({ flaw_uuid: flawUuid, trackers: [] }),
    ));
    expect((await getTrackerAutomanagerStatus(flawUuid)).trackers).toEqual([]);
  });

  it.each([
    ['malformed response', () => HttpResponse.json({ trackers: 'bad' })],
    ['unknown status', () => HttpResponse.json({ flaw_uuid: flawUuid, trackers: [{ ...record, status: 'unknown' }] })],
    ['HTTP error (text)', () => new HttpResponse('service unavailable', { status: 503 })],
    ['HTTP error (JSON)', () => HttpResponse.json({ detail: 'blocked' }, { status: 403 })],
    ['HTTP error (empty)', () => new HttpResponse(null, { status: 503 })],
    ['network failure', () => HttpResponse.error()],
  ])('rejects %s', async (_label, response) => {
    server.use(http.get(`${baseUrl}/tracker_automanager/api/v1/flaws/:id/trackers`, response));
    await expect(getTrackerAutomanagerStatus(flawUuid)).rejects.toThrow();
  });

  it('rejects when configuration is missing', async () => {
    const runtime = osimRuntime as any;
    const previous = runtime.value.backends.trackerAutomanager;
    runtime.value.backends.trackerAutomanager = '';
    await expect(getTrackerAutomanagerStatus(flawUuid)).rejects.toThrow('not configured');
    runtime.value.backends.trackerAutomanager = previous;
  });
});
