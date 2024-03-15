import axios from 'axios';
import { osidbFetch } from '@/services/OsidbAuthService';
import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

export async function getTrackers() {
  if (import.meta.env.VITE_RUNTIME_LEVEL === 'MOCK') {
    return axios.get('/mock/new-trackers-stage.json');
  }
  if (import.meta.env.VITE_RUNTIME_LEVEL === 'DEV') {
    // return osidbFetch({
    //   method: 'get',
    //   url: '/osidb/api/v1/trackers',
    // });
    return osidbFetch({
      method: 'get',
      url: '/osidb/api/v1/trackers',
      params: {
        include_fields: [
          'cve_id',
          'uuid',
          'impact',
          'source',
          'created_dt',
          'updated_dt',
          'classification',
          'is_major_incident',
          'title',
          'state',
          'unembargo_dt'
        ].join(',')
      },
    });
  }
  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/trackers',
    params: {
      include_fields: [
        'cve_id',
        'uuid',
        'impact',
        'source',
        'created_dt',
        'updated_dt',
        'classification',
        'is_major_incident',
        'title',
        'state',
        'unembargo_dt'
      ].join(',')
    },
  });
  // if (import.meta.env.VITE_RUNTIME_LEVEL === 'PROD') {
  //
  // }
}

export async function getTracker(uuid: string) {
  if (import.meta.env.VITE_RUNTIME_LEVEL === 'MOCK') {
    return axios.get('/mock/new-trackers-stage.json').then((response) => {
      const tracker = response.data.results.find(
        (tracker: { uuid: string }) => tracker.uuid === uuid,
      );
      return tracker;
    });
  }

  return osidbFetch({
    method: 'get',
    url: `/osidb/api/v1/trackers/${uuid}`,
  }).then((response) => {
    return response.data;
  });
}

export type TrackersPost = {
  affects: string[];
  ps_update_stream: string;
  resolution: string;
  embargoed: boolean;
  updated_dt: string;
};

export async function postTracker(requestBody: TrackersPost) {
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v1/trackers',
    data: requestBody,
  })
    .then(({ data }) => data)
    .then(
      createSuccessHandler({
        body: `Affect tracked on new ${requestBody.ps_update_stream} stream`,
      }),
    )
    .catch(createCatchHandler('Failed to create tracker'));
}

export type TrackersFilePost = {
  flaw_uuids: string[];
};

export async function fileTracker(requestBody: TrackersFilePost) {
  return osidbFetch({
    method: 'post',
    url: '/trackers/api/v1/file',
    data: requestBody,
  })
    .then(({ data }) => data)
    .catch(createCatchHandler('Failed to file tracker'));
}
