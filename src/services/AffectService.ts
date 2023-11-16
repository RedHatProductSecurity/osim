import axios from 'axios';
import {osidbFetch} from '@/services/OsidbAuthService';
import {z} from 'zod';
import {FlawType} from '@/generated-client';
import type {ZodAffectType} from '@/types/zodFlaw';
import router from '@/router';
import {osimRuntime} from '@/stores/osimRuntime';

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

export async function createFlaw(flawCreateRequest: any) {
  // {
  //   "type": "VULNERABILITY",
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
    data: flawCreateRequest,
  }).then(response => {
    return response.data;
  })
}
