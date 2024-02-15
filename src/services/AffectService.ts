import {osidbFetch} from '@/services/OsidbAuthService';

// export async function putAffect(uuid: string, affectObject: ZodAffectType) {
export async function putAffect(uuid: string, affectObject: any) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/affects/${uuid}`,
    data: affectObject,
  }).then(response => {
    console.log(response);
    return response.data;
  })
}

// export async function postAffect(affectObject: ZodAffectType) {
export async function postAffect(affectObject: any) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/affects`,
    data: affectObject,
  }).then(response => {
    console.log(response);
    return response.data;
  })
}
