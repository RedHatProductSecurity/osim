import { osidbFetch } from '@/services/OsidbAuthService';
import { osimRuntime } from '@/stores/osimRuntime';
import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

export async function getTracker(uuid: string) {
  return osidbFetch({
    method: 'get',
    url: `/osidb/api/v1/trackers/${uuid}`,
  }).then((response) => response.data);
}

export type TrackersPost = {
  affects: string[];
  ps_update_stream: string;
  resolution: string;
  embargoed: boolean;
  updated_dt: string;
  sync_to_bz?: boolean;
};

export async function fileTrackingFor(trackerData: TrackersPost[] | TrackersPost) {

  if (!Array.isArray(trackerData) || trackerData.length === 1) {
    const tracker = !Array.isArray(trackerData) ? trackerData : trackerData[0];
    return postTracker(tracker)
      .catch(createCatchHandler(`Failed to create tracker for ${tracker.ps_update_stream}`));
  }

  const errors = [];

  for (const tracker of trackerData) {
    try {
      await postTracker(tracker, trackerData.at(-1) === tracker);
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
    createCatchHandler(`${errors.length} trackers failed to file`)(errors);
  } else {
    createSuccessHandler({ title: 'Success!', body: `${trackerData.length} trackers filed.` })({ data: null });
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
    url: '/osidb/api/v1/trackers',
    data: requestBody,
  })
    .then(({ data }) => data);
}

export type TrackersFilePost = {
  flaw_uuids: string[];
};

export async function getTrackersForFlaws(requestBody: TrackersFilePost) {

  return osidbFetch({
    method: 'post',
    url: '/trackers/api/v1/file',
    data: requestBody,
  })
    .then(({ data }) => data)
    .catch(createCatchHandler('Failed to get trackers for Flaw'));
}

export function trackerUrl(type: string, id: string): string {
  switch (type) {
  case 'JIRA':
    return (new URL(`/browse/${id}`, osimRuntime.value.backends.jiraDisplay)).href;
  case 'BUGZILLA':
    return (new URL(`/${id}`, osimRuntime.value.backends.bugzilla)).href;
  default:
    return '#';
  }
}
