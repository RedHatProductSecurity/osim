import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

import { isCveValid } from '@/utils/helpers';
import { osidbFetch } from '@/services/OsidbAuthService';
import type { ZodAffectType, ZodAffectCVSSType } from '@/types/';
import type { GetOsidbApiV1AffectsQueryParams } from '@/types/';
import { beforeFetch } from './FlawService';

export async function getAffects(cveOrUuid: string) {
  const field: GetOsidbApiV1AffectsQueryParams = isCveValid(cveOrUuid) ? 'flaw__cve_id' : 'flaw__uuid';
  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/affects',
    params: {
      [field]: cveOrUuid,
    },
  });
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
    url: '/osidb/api/v1/affects/bulk',
    data: affectObjects,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affects Updated.' }))
    .catch(createCatchHandler('Error updating Affects:'));
}

type AffectPost = Omit<ZodAffectType, 'alerts' | 'cvss_scores' | 'trackers'>;
export async function postAffects(affectObjects: AffectPost[]) {
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v1/affects/bulk',
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
    url: '/osidb/api/v1/affects/bulk',
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
    url: `/osidb/api/v1/affects/${affectId}/cvss_scores/${cvssScoresId}`,
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
    url: `/osidb/api/v1/affects/${affectId}/cvss_scores`,
    data: postObject,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem updating affect CVSS scores:'));
}

export async function deleteAffectCvssScore(affectId: string, cvssScoresId: string) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/affects/${affectId}/cvss_scores/${cvssScoresId}`,
  })
    .then(response => response.data)
    .catch(createCatchHandler('Problem deleting affect CVSS scores:'));
}
