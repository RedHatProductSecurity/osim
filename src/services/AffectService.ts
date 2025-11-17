import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import { isCveValid } from '@/utils/helpers';
import { osidbFetch } from '@/services/OsidbAuthService';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/';

import { beforeFetch } from './FlawService';

type AffectFetchCallback = (fetchedCount: number, totalCount: number) => void;
export async function getAffects(cveOrUuid: string, onFetchedCallback?: AffectFetchCallback):
Promise<{ data: { results: ZodAffectType[] }; response: Response }> {
  const field = isCveValid(cveOrUuid) ? 'cve_id' : 'flaw__uuid';
  const pageSize = 100;

  // First request to get up to 100 affects and the total count
  const firstResponse = await osidbFetch({
    method: 'get',
    url: '/osidb/api/v2/affects',
    params: {
      [field]: cveOrUuid,
      limit: pageSize,
    },
  });

  const allAffects = [...firstResponse.data.results];
  let nextUrl = firstResponse.data.next;

  if (onFetchedCallback) {
    onFetchedCallback(allAffects.length, firstResponse.data.count);
  }

  // Fetch remaining affects using the next URL
  while (nextUrl !== null) {
    // Extract the path and query parameters from the full URL
    const url = new URL(nextUrl);
    const relativePath = url.pathname + url.search;

    const response = await osidbFetch({
      method: 'get',
      url: relativePath,
    });

    allAffects.push(...response.data.results);
    nextUrl = response.data.next;

    if (onFetchedCallback) {
      onFetchedCallback(allAffects.length, firstResponse.data.count);
    }

    // Safety check to prevent infinite loops
    if (response.data.results.length === 0) {
      break;
    }
  }

  // Return response in the same format as the original
  return {
    data: {
      ...firstResponse.data,
      results: allAffects,
    },
    response: firstResponse.response,
  };
}

export async function putAffect(uuid: string, affectObject: any) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/affects/${uuid}`,
    data: affectObject,
  }, { beforeFetch });
}

export async function putAffectWithHandlers(uuid: string, affectObject: any) {
  return putAffect(uuid, affectObject)
    .then(createSuccessHandler({ title: 'Success!', body: 'Affect Updated.' }))
    .catch(createCatchHandler('Error updating Affect:'));
}

export async function putAffects(affectObjects: any[]) {
  return osidbFetch({
    method: 'put',
    url: '/osidb/api/v2/affects/bulk',
    data: affectObjects,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affects Updated.' }))
    .catch(createCatchHandler('Error updating Affects:'));
}

type AffectPost = Omit<ZodAffectType, 'alerts' | 'cvss_scores' | 'trackers'>;
export async function postAffects(affectObjects: AffectPost[]) {
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v2/affects/bulk',
    data: affectObjects,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affects Created.' }))
    .catch(createCatchHandler('Error creating Affects:'));
}

export async function deleteAffects(affectUuids: string[]) {
  if (affectUuids.length === 0) {
    return;
  }
  return osidbFetch({
    method: 'delete',
    url: '/osidb/api/v2/affects/bulk',
    data: affectUuids,
  })
    .then(createSuccessHandler({ title: 'Success!', body: `${affectUuids.length} Affect(s) Deleted.` }))
    .catch(createCatchHandler('Error deleting Affect:'));
}

// {
// "comment": "string",
// "cvss_version": "V2",
// "issuer": "RH",
// "vector": "string",
// "embargoed": true
//   "updated_dt": "2024-02-06T16:02:54.708Z"
// }
export async function putAffectCvssScore(
  affectId: string,
  cvssScoresId: string,
  cvssScoreObject: ZodAffectCVSSType,
) {
  const putObject: Record<string, any> = Object.assign({}, cvssScoreObject);
  delete putObject['uuid'];
  delete putObject['affect'];
  delete putObject['created_dt'];

  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v2/affects/${affectId}/cvss-scores/${cvssScoresId}`,
    data: putObject,
  }, { beforeFetch })
    .then(response => response.data)
    .catch(createCatchHandler('Problem updating affect CVSS scores:'));
}

// {
// "comment": "string",
// "cvss_version": "V2",
// "issuer": "RH",
// "vector": "string",
// "embargoed": true
// }
export async function postAffectCvssScore(affectId: string, cvssScoreObject: ZodAffectCVSSType) {
  const postObject: Record<string, any> = Object.assign({}, cvssScoreObject);
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v2/affects/${affectId}/cvss-scores`,
    data: postObject,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem updating affect CVSS scores:'));
}

export async function deleteAffectCvssScore(affectId: string, cvssScoresId: string) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v2/affects/${affectId}/cvss-scores/${cvssScoresId}`,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem deleting affect CVSS scores:'));
}
