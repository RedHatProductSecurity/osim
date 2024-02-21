import { osidbFetch } from '@/services/OsidbAuthService';
import { createCatchHandler, createSuccessHandler } from '@/composables/service-helpers';

// export async function putAffect(uuid: string, affectObject: ZodAffectType) {
export async function putAffect(uuid: string, affectObject: any) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/affects/${uuid}`,
    data: affectObject,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affect Updated.' }))
    .catch(createCatchHandler('Error updating Affect:'));
}

// export async function postAffect(affectObject: ZodAffectType) {
export async function postAffect(affectObject: any) {
  return osidbFetch({
    method: 'post',
    url: '/osidb/api/v1/affects',
    data: affectObject,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affect Created.' }))
    .catch(createCatchHandler('Error creating Affect:'));
}

export async function deleteAffect(uuid: string) {
  return osidbFetch({
    method: 'delete',
    url: `/osidb/api/v1/affects/${uuid}`,
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Affect Deleted.' }))
    .catch(createCatchHandler('Error deleting Affect:'));
}
