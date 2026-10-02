import { z } from 'zod';

import { osimRuntime } from '@/stores/osimRuntime';

export const TrackerAutomanagerRecord = z.object({
  ps_update_stream: z.string(),
  ps_module: z.string(),
  ps_component: z.string(),
  status: z.enum(['scheduled', 'running', 'created', 'failed', 'retrying']),
  failure_reason: z.string().nullable(),
  external_system_id: z.string().nullable(),
});

export const TrackerAutomanagerResponse = z.object({
  flaw_uuid: z.string(),
  trackers: z.array(TrackerAutomanagerRecord),
});

export type TrackerAutomanagerRecordType = z.infer<typeof TrackerAutomanagerRecord>;

export async function getTrackerAutomanagerStatus(flawUuid: string, signal?: AbortSignal) {
  const baseUrl = osimRuntime.value.backends.trackerAutomanager?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('Tracker creation status is not configured.');

  const response = await fetch(
    `${baseUrl}/tracker_automanager/api/v1/flaws/${encodeURIComponent(flawUuid)}/trackers`,
    { method: 'GET', credentials: 'include', mode: 'cors', cache: 'no-cache', signal },
  );
  if (!response.ok) throw new Error(`Tracker creation status request failed (${response.status}).`);

  return TrackerAutomanagerResponse.parse(await response.json());
}
