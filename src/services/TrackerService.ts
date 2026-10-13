import { createCatchHandler } from '@/composables/service-helpers';

import { osidbFetch } from '@/services/OsidbAuthService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { ZodTrackerType } from '@/types';

export function parseTrackerId(input: string): { external_system_id: string; type: 'BUGZILLA' | 'JIRA' } | null {
  const id = input.trim().toUpperCase();
  if (/^[A-Z][A-Z0-9_]*-[1-9][0-9]*$/.test(id)) {
    return { external_system_id: id, type: 'JIRA' };
  }
  if (/^[1-9][0-9]*$/.test(id)) {
    return { external_system_id: id, type: 'BUGZILLA' };
  }
  return null;
}

export async function findExistingTracker(externalId: string): Promise<ZodTrackerType> {
  const parsed = parseTrackerId(externalId);
  if (!parsed) throw new Error('Enter a valid Jira key or Bugzilla ID.');

  let results: ZodTrackerType[];
  let count: number;
  try {
    ({ data: { count, results } } = await osidbFetch({
      method: 'get',
      url: '/osidb/api/v2/trackers',
      cache: 'no-cache',
      params: { ...parsed, limit: 2 },
    }));
  } catch (error: any) {
    if (error?.response?.status === 403 || error?.response?.status === 404) {
      throw new Error('Tracker not found or inaccessible.');
    }
    throw error;
  }
  if (!count || !results?.length) throw new Error('Tracker not found or inaccessible.');
  if (count !== 1 || results.length !== 1) throw new Error('More than one tracker matches this ID.');
  const tracker = results[0];
  if (!tracker.uuid || !tracker.updated_dt || !Array.isArray(tracker.affects)
    || typeof tracker.embargoed !== 'boolean' || !tracker.ps_update_stream
    || tracker.external_system_id !== parsed.external_system_id || tracker.type !== parsed.type) {
    throw new Error('Tracker details are incomplete. Reload and try again.');
  }
  return tracker;
}

export async function updateExistingTracker(tracker: ZodTrackerType, affectUuid: string): Promise<ZodTrackerType> {
  const { data } = await osidbFetch({
    method: 'put',
    url: `/osidb/api/v2/trackers/${tracker.uuid}`,
    data: {
      affects: [...new Set([...tracker.affects, affectUuid])],
      updated_dt: tracker.updated_dt,
      embargoed: tracker.embargoed,
      ps_update_stream: tracker.ps_update_stream,
    },
  });
  return data as ZodTrackerType;
}

export type TrackersPost = {
  affects: string[];
  embargoed: boolean;
  ps_update_stream: string;
  sync_to_bz?: boolean;
  updated_dt?: string;
};

export async function fileTrackingFor(trackerData: TrackersPost | TrackersPost[]) {
  if (!Array.isArray(trackerData) || trackerData.length === 1) {
    const tracker = !Array.isArray(trackerData) ? trackerData : trackerData[0];
    return postTracker(tracker)
      .catch(createCatchHandler(`Failed to create tracker for ${tracker.ps_update_stream}`));
  }

  const errors = [];
  const successes = [];

  for (const tracker of trackerData) {
    try {
      const response = await postTracker(tracker, trackerData.at(-1) === tracker);
      successes.push(response);
    } catch (error: any) {
      if (error?.response?.data !== null && typeof error?.response?.data === 'object') {
        error.response.data.stream = tracker.ps_update_stream;
      } else if (error.response) {
        // error.response.data is probably a string with the HTML of the OSIDB error page
        error.response.data = {
          stream: tracker.ps_update_stream,
          error: error.response.data || error.response,
        };
      }
      errors.push(error);
    }
  }

  if (errors.length) {
    const messages = errors.slice();
    if (successes.length) {
      const list = successes.map(({ ps_update_stream }) => ps_update_stream).join(', ');
      const successMessage = `${successes.length} tracker(s) filed: ${list}`;
      messages.push(successMessage);
    }
    createCatchHandler(`${errors.length} trackers failed to file`)(messages);
    return Promise.reject({ errors, successes });
  } else {
    return Promise.resolve({ successes });
  }
}

export async function postTracker(requestBody: TrackersPost, shouldSyncToBz: boolean = true) {
  if (!shouldSyncToBz) {
    requestBody.sync_to_bz = false;
    // Setting this flag to false is used when a series of trackers are being created to avoid the
    // overhead of syncing to Bugzilla for each tracker, speeding up the process considerably
  }

  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v2/trackers',
    data: requestBody,
  })
    .then(({ data }) => data as ZodTrackerType);
}

export type TrackersFilePost = {
  flaw_uuids: string[];
};

export async function getTrackersForFlaws(requestBody: TrackersFilePost) {
  return osidbFetch({
    method: 'post',
    url: '/trackers/api/v2/file',
    data: requestBody,
  })
    .then(({ data }) => data)
    .catch(createCatchHandler('Failed to get trackers for Flaw'));
}

export function trackerUrl(type: string, id: string): string {
  switch (type) {
    case 'BUGZILLA':
      return (new URL(`/${id}`, osimRuntime.value.backends.bugzilla || 'http://bugzilla-service:8001')).href;
    case 'JIRA':
      return (new URL(`/browse/${id}`, osimRuntime.value.backends.jiraDisplay || 'http://jira-service:8002')).href;
    default:
      return '#';
  }
}
