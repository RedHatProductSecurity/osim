import { osidbFetch } from '@/services/OsidbAuthService';
import type { ZodFlawType } from '@/types/zodFlaw';
import { useToastStore } from '@/stores/ToastStore';
import router from '@/router';
import { osimRuntime } from '@/stores/osimRuntime';
import {
  getDisplayedOsidbError,
  type OsidbFetchOptions
} from '@/services/OsidbAuthService';
import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

export async function beforeFetch(options: OsidbFetchOptions) {
  if (options.data && ['PUT', 'POST'].includes(options.method.toUpperCase())) {
    try {
      const updated_dt = await getUpdatedDt(options.url);
      options.data.updated_dt = updated_dt;
      if (!updated_dt) {
        throw new Error('An updated_dt could not be fetched');
      }
    } catch (error) {
      console.error('Problem on fetch preparation. ', (error as Error).message);
      throw new Error('Problem on fetch preparation. ' + (error as Error).message);
    }
  }
}

const FLAW_LIST_FIELDS = [
  'cve_id',
  'uuid',
  'impact',
  'source',
  'created_dt',
  'updated_dt',
  'classification',
  // 'is_major_incident', TODO: replace with major_incident_state?
  'title',
  'state', // not to be confused with classification.state
  'unembargo_dt',
  'embargoed',
  'owner',
];

export async function getFlaws(offset = 0, limit = 20, args = {}) {
  const params = {
    include_fields: FLAW_LIST_FIELDS.join(','),
    limit: limit,
    offset: offset,
    ...args,
  };

  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/flaws',
    params,
  });
}

export async function getFlaw(uuid: string): Promise<ZodFlawType> {
  return osidbFetch({
    method: 'get',
    url: `/osidb/api/v1/flaws/${uuid}`,
    params: {
      include_meta_attr: 'bz_id',
    },
  }).then((response) => response.data);
}

export async function getUpdatedDt(url: string): Promise<string> {
  return osidbFetch({
    method: 'get',
    url: url,
    params: {
      include_fields: 'updated_dt',
    },
  }).then((response) => response.data.updated_dt);
}

export async function putFlaw(uuid: string, flawObject: ZodFlawType) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${uuid}`,
    data: flawObject,
  }, { beforeFetch })
    .then((response) => response.data)
    .then(createSuccessHandler({ title: 'Success!', body: 'Flaw saved' }))
    .catch(createCatchHandler('Could not update Flaw'));
}

// {
//   "comment": "string",
//   "cvss_version": "string",
//   "issuer": "RH",
//   "score": 0,
//   "vector": "string",
//   "embargoed": true,
//   "updated_dt": "2024-02-06T16:02:54.708Z"
// }
export async function putFlawCvssScores(
  flawId: string,
  cvssScoresId: string,
  cvssScoreObject: unknown,
) {
  const putObject: Record<string, any> = Object.assign({}, cvssScoreObject);
  delete putObject['uuid'];
  delete putObject['flaw'];
  delete putObject['created_dt'];
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${flawId}/cvss_scores/${cvssScoresId}`,
    data: putObject,
  }, { beforeFetch })
    .then(createSuccessHandler({ title: 'Success!', body: 'Saved CVSS Scores' }))
    .then((response) => response.data)
    .catch(createCatchHandler('CVSS Scores Update Error'));
}

// {
//   "comment": "string",
//   "cvss_version": "string",
//   "issuer": "RH",
//   "score": 0,
//   "vector": "string",
//   "embargoed": true
// }
export async function postFlawCvssScores(flawId: string, cvssScoreObject: unknown) {
  const postObject: Record<string, any> = Object.assign({}, cvssScoreObject);
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawId}/cvss_scores`,
    data: postObject,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Saved CVSS Scores' }))
    .then((response) => response.data)
    .catch(createCatchHandler('CVSS scores Update Error'));
}

export async function postFlawPublicComment(uuid: string, comment: string, embargoed: boolean) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${uuid}/comments`,
    data: {
      text: comment,
      type: 'BUGZILLA',
      embargoed,
    },
  }).then((response) => response.data);
}

// Source openapi.yaml schema definition for `/osidb/api/v1/flaws/{flaw_id}/promote`
export async function promoteFlaw(uuid: string) {
  const { addToast } = useToastStore();
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${uuid}/promote`,
  })
    .then((response) => {
      addToast({
        title: 'Flaw Promoted',
        body: response.data.classification.state,
        css: 'success',
      });
      return response.data;
    })
    .catch((error) => {
      const displayedError = getDisplayedOsidbError(error);
      addToast({
        title: 'Error Promoting Flaw',
        body: displayedError,
        css: 'warning',
      });
      console.error('❌ Problem promoting flaw:', error);
      throw error;
    });
}
// Source openapi.yaml schema definition for `/osidb/api/v1/flaws/{flaw_id}/reject`
export async function rejectFlaw(uuid: string, data: Record<'reason', string>) {
  const { addToast } = useToastStore();
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${uuid}/reject`,
    data,
  })
    .then((response) => {
      addToast({
        title: 'Flaw Rejected',
        body: response.data.classification.state,
        css: 'success',
      });
      return response.data;
    })
    .catch((error) => {
      const { addToast } = useToastStore();
      const displayedError = getDisplayedOsidbError(error);
      addToast({
        title: 'Error Rejecting Flaw',
        body: displayedError,
        css: 'warning',
      });
      console.error('❌ Problem rejecting flaw:', error);
      throw error;
    });
}

// TODO paginate search results page
export async function searchFlaws(query: string) {
  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/flaws',
    params: {
      include_fields: FLAW_LIST_FIELDS.join(','),
      search: query,
    },
  })
    .then((response) => response.data)
    .catch(createCatchHandler('Problem searching flaws:'));
}

export async function advancedSearchFlaws(params: Record<string, string>) {
  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/flaws',
    params: {
      ...params,
      include_fields: FLAW_LIST_FIELDS.join(','),
    },
  })
    .then((response) => response.data)
    .catch(createCatchHandler('Problem searching flaws:'));
}

export async function postFlaw(requestBody: any) {
  // {
  //   "cve_id": "string",
  //   "impact": "LOW",
  //   "component": "string",
  //   "title": "string",
  //   "description": "string",
  //   "summary": "string",
  //   "statement": "string",
  //   "cwe_id": "string",
  //   "unembargo_dt": "2023-06-26T06:19:23.982Z",
  //   "source": "ADOBE",
  //   "reported_dt": "2023-06-26T06:19:23.982Z",
  //   "mitigation": "string",
  //   "cvss2": "string",
  //   "cvss2_score": 0,
  //   "nvd_cvss2": "string",
  //   "cvss3": "string",
  //   "cvss3_score": 0,
  //   "nvd_cvss3": "string",
  //   "is_major_incident": true,
  //   "embargoed": true
  // }
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v1/flaws',
    data: requestBody,
  }).then((response) => {
    return response.data;
  });
}

export function getFlawOsimLink(flawUuid: any) {
  const osimPath = router.resolve({ name: 'flaw-details', params: { id: flawUuid } }).path;
  const link = window.location.protocol + '//' + window.location.host + osimPath;
  return link;
}

export function getFlawBugzillaLink(flaw: any) {
  let bzId = String(flaw.meta_attr?.bz_id);
  if (bzId === '') {
    bzId = '0';
  }
  const link = osimRuntime.value.backends.bugzilla + '/show_bug.cgi?id=' + bzId;
  return link;
}

type FlawReferencePost = {
  description: string;
  type: string;
  url: string;
  embargoed: boolean;
};

export function postFlawReference(flawId: string, requestBody: FlawReferencePost) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawId}/references`,
    data: requestBody,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Reference created.' }))
    .catch(createCatchHandler('Error creating Reference:'));
}

type FlawReferencePut = FlawReferencePost & {
  updated_dt: string;
};

export function putFlawReference(
  flawId: string,
  referenceId: string,
  requestBody: FlawReferencePut,
) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${flawId}/references/${referenceId}`,
    data: requestBody,
  }, { beforeFetch })
    .then(createSuccessHandler({ title: 'Success!', body: 'Reference updated.' }))
    .catch(createCatchHandler('Error updating Reference:'));
}


export async function deleteFlawReference(
  flawId: string,
  referenceId: string,
) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/flaws/${flawId}/references/${referenceId}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Reference deleted.' }))
    .catch(createCatchHandler('Error deleting Reference:'));
}

export type FlawAcknowledgmentPost = {
  name: string;
  affiliation: string;
  from_upstream: boolean;
  embargoed: boolean;
};

export async function postFlawAcknowledgment(flawId: string, requestBody: FlawAcknowledgmentPost) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawId}/acknowledgments`,
    data: requestBody,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Acknowledgment created.' }))
    .catch(createCatchHandler('Error creating Acknowledgment:'));
}

export type FlawAcknowledgmentPut = FlawAcknowledgmentPost & {
  updated_dt: string;
};

export async function putFlawAcknowledgment(
  flawId: string,
  acknowledgmentId: string,
  requestBody: FlawAcknowledgmentPut,
) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${flawId}/acknowledgments/${acknowledgmentId}`,
    data: requestBody,
  }, { beforeFetch })
    .then(createSuccessHandler({ title: 'Success!', body: 'Acknowledgment updated.' }))
    .catch(createCatchHandler('Error updating Acknowledgment:'));
}

export async function deleteFlawAcknowledgment(
  flawId: string,
  acknowledgmentId: string,
) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/flaws/${flawId}/acknowledgments/${acknowledgmentId}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Acknowledgment deleted.' }))
    .catch(createCatchHandler('Error deleting Acknowledgment:'));
}
