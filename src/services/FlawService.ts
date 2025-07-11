import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import type { ZodAffectType, ZodFlawCVSSType, ZodFlawType } from '@/types';
import { osidbFetch } from '@/services/OsidbAuthService';
import { useToastStore } from '@/stores/ToastStore';
import router from '@/router';
import { osimRuntime } from '@/stores/osimRuntime';
import type { OsidbFetchOptions } from '@/services/OsidbAuthService';
import { getDisplayedOsidbError } from '@/services/osidb-errors-helpers';

export async function beforeFetch(options: OsidbFetchOptions) {
  if (options.data && ['PUT'].includes(options.method.toUpperCase())) {
    try {
      const updated_dt = await getUpdatedDt(options.url);

      (options.data as Record<string, any>).updated_dt = updated_dt;

      if (!updated_dt) {
        throw new Error('An updated_dt could not be fetched');
      }
    } catch (error) {
      console.error('FlawService::beforeFetch() Problem on fetch preparation. ', (error as Error).message);
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
  'title',
  'unembargo_dt',
  'embargoed',
  'owner',
  'labels',
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

export async function getRelatedFlaws(affects: ZodAffectType[]): Promise<ZodFlawType[]> {
  let relatedFlaws: ZodFlawType[] = [];

  if (!affects?.[0]) {
    return relatedFlaws;
  }

  const { ps_component: firstAffectPsComponent, ps_module: firstAffectPsModule } = affects[0];

  try {
    const include_fields = [
      'cve_id',
      'uuid',
      'affects',
      'created_dt',
      'updated_dt',
    ].join(',');

    const response = await osidbFetch({
      method: 'get',
      url: '/osidb/api/v1/flaws',
      params: {
        include_fields,
        affects__ps_module: firstAffectPsModule,
        affects__ps_component: firstAffectPsComponent,
        order: ['-created_dt'],
        limit: 10,
      },
    });
    relatedFlaws.push(...response.data.results);
    for (const affect of affects.slice(1)) {
      relatedFlaws = relatedFlaws.filter(flaw => flaw.affects.some(
        matchingAffect =>
          affect.ps_module === matchingAffect.ps_module && affect.ps_component === matchingAffect.ps_component,
      ));
    }
  } catch (error) {
    console.error('Problem fetching related flaws:', error);
  }

  return relatedFlaws;
}

export async function getFlaw(uuidOrCve: string, breakCache?: boolean): Promise<ZodFlawType> {
  return osidbFetch({
    method: 'get',
    url: `/osidb/api/v1/flaws/${uuidOrCve}`,
    cache: breakCache ? 'no-cache' : 'default',
    params: {
      include_meta_attr: 'bz_id',
      include_history: 'true',
      exclude_fields: 'affects',
    },
  }).then(response => response.data);
}

export async function getUpdatedDt(url: string): Promise<string> {
  return osidbFetch({
    method: 'get',
    url: url,
    params: {
      include_fields: 'updated_dt',
    },
  }).then(response => response.data.updated_dt);
}

export async function putFlaw(uuid: string, flawObject: ZodFlawType, createJiraTask = false) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${uuid}`,
    data: flawObject,
    params: {
      ...(createJiraTask && { create_jira_task: true }),
    },
  }, { beforeFetch })
    .then(response => response.data)
    .then(createSuccessHandler({ title: 'Success!', body: 'Flaw saved' }))
    .catch(createCatchHandler('Could not update Flaw'));
}

export async function putFlawCvssScores(
  flawId: string,
  cvssScoresId: string,
  cvssScoreObject: ZodFlawCVSSType,
) {
  const putObject: Partial<ZodFlawCVSSType> = Object.assign({}, cvssScoreObject);
  delete putObject['uuid'];
  delete putObject['flaw'];
  delete putObject['created_dt'];
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${flawId}/cvss_scores/${cvssScoresId}`,
    data: putObject,
  }, { beforeFetch })
    .then(createSuccessHandler({ title: 'Success!', body: 'Saved CVSS Scores' }))
    .then(response => response.data)
    .catch(createCatchHandler('CVSS Scores Update Error'));
}

export async function deleteFlawCvssScores(
  flawId: string,
  cvssScoresId: string,
) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/flaws/${flawId}/cvss_scores/${cvssScoresId}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'CVSS score deleted.' }))
    .catch(createCatchHandler('Error deleting CVSS score:'));
}

type PostFlawCvssScores = Omit<ZodFlawCVSSType, 'alerts' | 'flaw' | 'score' | 'updated_dt' | 'uuid'>;
export async function postFlawCvssScores(flawId: string, cvssScoreObject: PostFlawCvssScores) {
  const postObject = Object.assign({}, cvssScoreObject);
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawId}/cvss_scores`,
    data: postObject,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Saved CVSS Scores' }))
    .then(response => response.data)
    .catch(createCatchHandler('CVSS scores Update Error'));
}

export async function postFlawComment(
  flawId: string, comment: string, creator: string, isPrivate: boolean, embargoed: boolean,
) {
  const type = isPrivate ? 'Private' : 'Public';
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawId}/comments`,
    data: {
      text: comment,
      creator: creator,
      is_private: isPrivate,
      embargoed,
    },
  }).then(createSuccessHandler({ title: 'Success!', body: `${type} comment saved.` }))
    .then(response => response.data)
    .catch(createCatchHandler(`Error saving ${type} comment`));
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
      console.error('FlawService::promoteFlaw() Problem promoting flaw:', error);
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
      console.error('FlawService::rejectFlaw() Problem rejecting flaw:', error);
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
    .then(response => response.data)
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
    .then(response => response.data)
    .catch(createCatchHandler('Problem searching flaws:'));
}

export async function postFlaw(requestBody: ZodFlawType) {
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v1/flaws',
    data: requestBody,
  }).then((response) => {
    return response.data;
  });
}

export function getFlawOsimLink(flawUuid: string) {
  const osimPath = router.resolve({ name: 'flaw-details', params: { id: flawUuid } }).path;
  const link = window.location.protocol + '//' + window.location.host + osimPath;
  return link;
}

export function getFlawBugzillaLink(flaw: ZodFlawType) {
  let bzId = flaw.meta_attr?.bz_id;
  if (!bzId) {
    bzId = '0';
  }
  const link = osimRuntime.value.backends.bugzilla + '/show_bug.cgi?id=' + bzId;
  return link;
}

type FlawReferencePost = {
  description: string;
  embargoed: boolean;
  type: string;
  url: string;
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

type FlawReferencePut = {
  updated_dt: string;
} & FlawReferencePost;

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
  affiliation: string;
  embargoed: boolean;
  from_upstream: boolean;
  name: string;
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

export type FlawAcknowledgmentPut = {
  updated_dt: string;
} & FlawAcknowledgmentPost;

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
