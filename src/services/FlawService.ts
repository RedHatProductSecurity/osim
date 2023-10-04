import axios from 'axios';
import {osidbFetch} from '@/services/OsidbAuthService';
import {z} from 'zod';
import {FlawType} from '@/generated-client';
import type {ZodFlawType} from '@/types/zodFlaw';
import router from '@/router';
import {osimRuntime} from '@/stores/osimRuntime';


export async function getFlaws() {
  // TODO add filtering parameters
  // axios.get('http://127.0.0.1:4010/osidb/api/v1/flaws?bz_id=999.1777106091507&changed_after=2016-05-25T04%3A00%3A00.0Z&changed_before=1953-04-15T05%3A00%3A00.0Z&created_dt=1997-02-22T05%3A00%3A00.0Z&cve_id=suscipit,quia,dignissimos&cvss2=nobis&cvss2_score=-3.12820402011057e%2B38&cvss3=nam&cvss3_score=2.2240193839647933e%2B38&cwe_id=reprehenderit&description=sed&embargoed=false&exclude_fields=pariatur&flaw_meta_type=enim,sed,enim&impact=LOW&include_fields=et,quisquam,sunt,aut&include_meta_attr=ullam,libero,at,alias&reported_dt=1972-11-30T00%3A00%3A00.0Z&resolution=DUPLICATE&search=unde&source=PHP&state=NEW&statement=sunt&summary=maiores&title=reprehenderit&tracker_ids=eum,cum,at,odio,a&type=WEAKNESS&unembargo_dt=1949-12-22T00%3A00%3A00.0Z&updated_dt=1973-03-16T05%3A00%3A00.0Z&uuid=c605cdc8-0f63-c5ec-d32d-75c184147eba')
  // axios.get('https://osidb-stage.example.com/osidb/api/v1/flaws')
  // return axios.get('/mock/prod-flaws.json')
  // return axios.get('/mock/prod-flaws.json')
  if (import.meta.env.VITE_RUNTIME_LEVEL === 'MOCK') {
    return axios.get('/mock/new-flaws-stage.json');
  }
  if (import.meta.env.VITE_RUNTIME_LEVEL === 'DEV') {
    // return osidbFetch({
    //   method: 'get',
    //   url: '/osidb/api/v1/flaws',
    // });
    return osidbFetch({
      method: 'get',
      url: '/osidb/api/v1/flaws',
      params: {
        include_fields: 'cve_id,uuid,impact,source,created_dt,updated_dt,classification,is_major_incident,title,state,unembargo_dt',
      },
    });
  }
  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/flaws',
    params: {
      include_fields: 'cve_id,uuid,impact,source,created_dt,updated_dt,classification,is_major_incident,title,state,unembargo_dt',
    },
  });
  // if (import.meta.env.VITE_RUNTIME_LEVEL === 'PROD') {
  //
  // }
}

/**
 * Get the flaws for the queue, filtered to required fields.
 */
export async function getFlawQueue() {
  // TODO add filtering parameters
  // axios.get('http://127.0.0.1:4010/osidb/api/v1/flaws?bz_id=999.1777106091507&changed_after=2016-05-25T04%3A00%3A00.0Z&changed_before=1953-04-15T05%3A00%3A00.0Z&created_dt=1997-02-22T05%3A00%3A00.0Z&cve_id=suscipit,quia,dignissimos&cvss2=nobis&cvss2_score=-3.12820402011057e%2B38&cvss3=nam&cvss3_score=2.2240193839647933e%2B38&cwe_id=reprehenderit&description=sed&embargoed=false&exclude_fields=pariatur&flaw_meta_type=enim,sed,enim&impact=LOW&include_fields=et,quisquam,sunt,aut&include_meta_attr=ullam,libero,at,alias&reported_dt=1972-11-30T00%3A00%3A00.0Z&resolution=DUPLICATE&search=unde&source=PHP&state=NEW&statement=sunt&summary=maiores&title=reprehenderit&tracker_ids=eum,cum,at,odio,a&type=WEAKNESS&unembargo_dt=1949-12-22T00%3A00%3A00.0Z&updated_dt=1973-03-16T05%3A00%3A00.0Z&uuid=c605cdc8-0f63-c5ec-d32d-75c184147eba')
  // axios.get('https://osidb-stage.example.com/osidb/api/v1/flaws')
  return axios.get('/mock/prod-flaws.json');
}

export async function getFlaw(uuid: string) {
  if (import.meta.env.VITE_RUNTIME_LEVEL === 'MOCK') {
    return axios.get('/mock/new-flaws-stage.json')
        .then(response => {
          const flaw = response.data.results.find((flaw: { uuid: string; }) => flaw.uuid === uuid);
          return flaw;
        })
  }

  return osidbFetch({
    method: 'get',
    url: `/osidb/api/v1/flaws/${uuid}`,
    params: {
      // 'include_meta_attr': '*', // too many fields
      'include_meta_attr': 'bz_id',
    },
  }).then(response => {
    return response.data;
  })
}

export async function putFlaw(uuid: string, flawObject: ZodFlawType) {
  return osidbFetch({
    method: 'put',
    url: `/osidb/api/v1/flaws/${uuid}`,
    data: flawObject,
  }).then(response => {
    console.log(response);
    return response.data;
  })
}

export async function postFlawPublicComment(uuid: string, comment: string) {
  return osidbFetch({
    method: 'post',
    url: `/osidb/api/v1/flaws/${uuid}/comments`,
    data: {
      text: comment,
      type: 'BUGZILLA',
      embargoed: true, // read-only but mandatory
    },
  }).then(response => {
    console.log(response);
    return response.data;
  })
}

export async function searchFlaws(query: string) {
  return osidbFetch({
    method: 'get',
    url: '/osidb/api/v1/flaws',
    params: {
      search: query,
    },
  }).then(response => {
    return response.data;
  });
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

export function getFlawOsimLink(flawUuid: any) {
  const osimPath = router.resolve({name: 'flaw-details', params: {id: flawUuid}}).path;
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
