import { osidbFetch } from '@/services/OsidbAuthService';
import { findExistingTracker, parseTrackerId, updateExistingTracker } from '@/services/TrackerService';
import type { ZodTrackerType } from '@/types';

vi.mock('@/services/OsidbAuthService', () => ({ osidbFetch: vi.fn() }));

const tracker = {
  uuid: 'tracker-uuid',
  external_system_id: 'OSIDB-123',
  type: 'JIRA',
  affects: ['old', 'old'],
  ps_update_stream: 'stream',
  embargoed: true,
  updated_dt: '2026-01-01T00:00:00Z',
} as ZodTrackerType;

beforeEach(() => vi.clearAllMocks());

it('parses only Jira keys and positive Bugzilla IDs', () => {
  expect(parseTrackerId(' osidb-12 ')).toEqual({ external_system_id: 'OSIDB-12', type: 'JIRA' });
  expect(parseTrackerId(' 123 ')).toEqual({ external_system_id: '123', type: 'BUGZILLA' });
  for (const invalid of ['', ' ', 'https://jira/browse/OSIDB-12', 'FOO-0', '0', '-12', 'a b-12']) {
    expect(parseTrackerId(invalid)).toBeNull();
  }
});

it('looks up exactly one accessible tracker by external ID and type', async () => {
  vi.mocked(osidbFetch).mockResolvedValue({ data: { count: 1, results: [tracker] } } as any);
  expect(await findExistingTracker('osidb-123')).toEqual(tracker);
  expect(osidbFetch).toHaveBeenCalledWith({
    method: 'get',
    url: '/osidb/api/v2/trackers',
    cache: 'no-cache',
    params: { external_system_id: 'OSIDB-123', type: 'JIRA', limit: 2 },
  });
  vi.mocked(osidbFetch).mockResolvedValue({ data: { count: 0, results: [] } } as any);
  await expect(findExistingTracker('OSIDB-123')).rejects.toThrow('Tracker not found or inaccessible');
  vi.mocked(osidbFetch).mockResolvedValue({ data: { count: 2, results: [tracker, tracker] } } as any);
  await expect(findExistingTracker('OSIDB-123')).rejects.toThrow('More than one');
  vi.mocked(osidbFetch).mockRejectedValue({ response: { status: 403 } });
  await expect(findExistingTracker('OSIDB-123')).rejects.toThrow('Tracker not found or inaccessible');
});

it('preserves and deduplicates associations, stream, embargo and tracker timestamp', async () => {
  vi.mocked(osidbFetch).mockResolvedValue({ data: tracker } as any);
  await updateExistingTracker(tracker, 'new');
  expect(osidbFetch).toHaveBeenCalledWith({
    method: 'put',
    url: '/osidb/api/v2/trackers/tracker-uuid',
    data: { affects: ['old', 'new'],
      updated_dt: tracker.updated_dt,
      embargoed: true,
      ps_update_stream: 'stream' },
  });
  expect(JSON.stringify(vi.mocked(osidbFetch).mock.calls[0][0])).not.toContain('sync_to_bz');
  vi.mocked(osidbFetch).mockRejectedValue({ response: { status: 409 } });
  await expect(updateExistingTracker(tracker, 'new')).rejects.toMatchObject({ response: { status: 409 } });
  expect(osidbFetch).toHaveBeenCalledTimes(2);
});
