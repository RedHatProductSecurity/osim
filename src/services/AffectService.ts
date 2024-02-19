import { osidbFetch } from '@/services/OsidbAuthService';
import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

// export async function putAffect(uuid: string, affectObject: ZodAffectType) {
export async function putAffect(uuid: string, affectObject: any) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/affects/${uuid}`,
    data: affectObject,
  }).then((response) => {
    console.log(response);
    return response.data;
  });
}

// export async function postAffect(affectObject: ZodAffectType) {
export async function postAffect(affectObject: any) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/affects`,
    data: affectObject,
  }).then((response) => {
    console.log(response);
    return response.data;
  });
}

export async function deleteAffect(uuid: string) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/affects/${uuid}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affect Deleted.' }))
    .catch(createCatchHandler('Error deleting Affect:'));
}

type AffectAcknowledgmentPost = {
  name: string;
  affiliation: string;
  from_upstream: boolean;
  embargoed: boolean;
};

export async function postAffectAcknowledgment(
  flawId: string,
  requestBody: AffectAcknowledgmentPost
) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${flawId}/acknowledgments`,
    data: requestBody,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Acknowledgment created.' }))
    .catch(createCatchHandler('Error creating Acknowledgment:'));
}

type AffectAcknowledgmentPut = AffectAcknowledgmentPost & {
  updated_dt: string;
};

export async function putAffectAcknowledgment(
  flawId: string,
  acknowledgmentId: string,
  requestBody: AffectAcknowledgmentPut
) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${flawId}/acknowledgments/${acknowledgmentId}`,
    data: requestBody,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Acknowledgment updated.' }))
    .catch(createCatchHandler('Error updating Acknowledgment:'));
}

