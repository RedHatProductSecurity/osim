
import axios from 'axios';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import IssueEdit from '@/components/IssueEdit.vue';
import { VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useToastStore } from '@/stores/ToastStore';
import LabelEditable from '@/components/widgets/LabelEditable.vue';

import type { ZodFlawType } from '@/types/zodFlaw';

const FLAW_BASE_URI = `/osidb/api/v1/flaws`;
// const FLAW_BASE_URI = `http://localhost:5173/tests/3ede0314-a6c5-4462-bcf3-b034a15cf106`;
const putHandler = http.put(
  `${FLAW_BASE_URI}/:id`,
  async ({ request, params, cookies }) => {
    const reader = request.body?.getReader();

    if (!reader) {
      throw new Error('Request body is not available');
    }

    const result = await reader.read();

    if (result.done) {
      throw new Error('Request body stream is already read to the end');
    }

    const decoder = new TextDecoder('utf-8');
    const requestBody = decoder.decode(result.value);
    return HttpResponse.json(JSON.parse(requestBody));
  }
);

const server = setupServer(putHandler);

describe('IssueEdit', () => {
  let subject: VueWrapper<InstanceType<typeof IssueEdit>>;

  beforeAll(() => {
    // Store below depends on global pinia test instance
    createTestingPinia({
      initialState: {
        toasts: [],
      },
    });

    server.listen({ onUnhandledRequest: 'error' });

    const flaw = sampleFlaw();
    flaw.owner = 'test owner';
    subject = mount(IssueEdit, {
      plugins: [useToastStore()],
      // shallow: true,
      props: {
        flaw,
      },
      global: {
        mocks: {
          // router: useRouter(),
          router: vi.fn().mockReturnValue('mock flaw osim link'),
        },
        stubs: {
          // osimFormatDate not defined on test run, so we need to stub it
          EditableDate: true,
        },
      },
    });
  });

  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const assigneeFieldSelector = 'label[for=]';
  // const statusFieldSelector = '#osim-static-label-status';  

  it('mounts and renders', async () => {
    expect(subject.exists()).toBe(true);
    expect(subject.vm).toBeDefined();
    expect(subject.find('label').exists()).toBe(true);
    // expect(subject.find(statusFieldSelector).exists()).toBe(true);
  });

  it('displays correct Assignee field value from props', async () => {
    const assigneeField = subject.findAllComponents(LabelEditable).at(7)
    expect(
      assigneeField?.find('span.form-label').text()
    ).toBe('Assignee');

    expect(assigneeField?.attributes().modelvalue).toBe(
      'test owner'
    );
  });

  // it('displays correct Status field value from props', async () => {
  //   expect(
  //     subject.find(statusFieldSelector).find('span.form-label').text()
  //   ).toBe('Status');
  //   expect(subject.find(statusFieldSelector).find('div').text()).toBe('REVIEW');
  // });

  it('does network stuff', async () => {
    // @ts-ignore
    const flaw: ZodFlawType = sampleFlaw();
    // @ts-ignore
    flaw.owner = 'networking test owner';
    // @ts-ignore
    const result = await mockedPutFlaw(flaw.uuid, flaw);
    expect(result.owner).toBe('networking test owner');
  });
});

function mockedPutFlaw(uuid: string, flawObject: typeof sampleFlaw) {
  return axios({
    method: 'put',
    url: `${FLAW_BASE_URI}/${uuid}`,
    data: flawObject,
  })
    .then((response) => {
      return response.data;
    })
    .catch((e) => console.error('🚨 Mocked PUT failed due to', e.message));
}

function sampleFlaw() /*:ZodFlawType */ {
  return {
    uuid: '3ede0314-a6c5-4462-bcf3-b034a15cf106',
    type: 'VULNERABILITY',
    cve_id: 'CVE-2007-97239',
    state: 'NEW',
    resolution: '',
    impact: 'LOW',
    component: 'reality.',
    title: 'sample title',
    trackers: [],
    description: 'comment',
    summary: 'I am a spooky CVE',
    requires_summary: 'APPROVED',
    statement: 'Statement for None',
    cwe_id: 'CWE-1',
    unembargo_dt:
      '[native Date Thu Nov 30 2023 21:52:48 GMT-0500 (Eastern Standard Time)]',
    source: 'GIT',
    reported_dt:
      '[native Date Sun Oct 05 1975 03:45:17 GMT-0400 (Eastern Daylight Time)]',
    mitigation: 'CVE mitigation',
    cvss2: '',
    cvss2_score: null,
    nvd_cvss2: '',
    cvss3: '',
    cvss3_score: null,
    nvd_cvss3: '',
    is_major_incident: true,
    major_incident_state: 'APPROVED',
    nist_cvss_validation: '',
    affects: [
      {
        uuid: 'bff95399-ef12-43fe-878d-4629297c2aa8',
        flaw: '3ede0314-a6c5-4462-bcf3-b034a15cf106',
        type: 'DEFAULT',
        affectedness: 'AFFECTED',
        resolution: 'FIX',
        ps_module: 'openshift-4',
        ps_component: 'openshift',
        impact: 'LOW',
        cvss2: '',
        cvss2_score: null,
        cvss3: '',
        cvss3_score: null,
        trackers: [],
        delegated_resolution: null,
        cvss_scores: [],
        embargoed: false,
        created_dt: '2021-09-13T09:09:38Z',
        updated_dt: '2023-12-06T17:12:21Z',
      },
    ],
    meta: [
      {
        uuid: '1b7b911d-1415-4d3f-a380-4b82ed8a8abc',
        type: 'MAJOR_INCIDENT_LITE',
        meta_attr: {
          id: '5248528',
          name: 'hightouch-lite',
          setter: 'ex-maple@example.com',
          status: '-',
          type_id: '1209',
          is_active: '1',
          creation_date: '2023-12-06T17:00:48Z',
          modification_date: '2023-12-06T17:00:48Z',
        },
        embargoed: false,
        created_dt: '2021-09-13T09:09:38Z',
        updated_dt: '2023-12-06T17:12:21Z',
      },
      {
        uuid: '3c680fb9-e8a4-4ceb-92fc-67dd3e020168',
        type: 'MAJOR_INCIDENT',
        meta_attr: {
          id: '5248527',
          name: 'hightouch',
          setter: 'ex-maple@example.com',
          status: '+',
          type_id: '788',
          is_active: '1',
          creation_date: '2023-12-06T17:00:48Z',
          modification_date: '2023-12-06T17:12:21Z',
        },
        embargoed: false,
        created_dt: '2021-09-13T09:09:38Z',
        updated_dt: '2023-12-06T17:12:21Z',
      },
      // {
      //   uuid: '24f7f36c-31e9-45ba-842d-9733141807d3',
      //   type: 'REQUIRES_SUMMARY',
      //   meta_attr: {
      //     id: '5248524',
      //     name: 'requires_doc_text',
      //     setter: 'ex-maple@example.com',
      //     status: '+',
      //     type_id: '415',
      //     is_active: '1',
      //     creation_date: '2023-12-06T16:52:30Z',
      //     modification_date: '2023-12-06T17:12:21Z',
      //   },
      //   embargoed: false,
      //   created_dt: '2021-09-13T09:09:38Z',
      //   updated_dt: '2023-12-06T17:12:21Z',
      // },
    ],
    comments: [
      {
        uuid: '0d90cb33-cbdc-4bd8-bef0-7b5c7f33ece2',
        type: 'BUGZILLA',
        external_system_id: '15302346',
        order: 0,
        meta_attr: {
          id: '15302346',
          tags: '[]',
          text: 'Dictum maecenas congue quis quam phasellus aenean',
          time: '2021-09-13T09:09:38Z',
          count: '0',
          bug_id: '1984541',
          creator: 'ex-maple@example.com',
          creator_id: '412888',
          is_private: 'False',
          attachment_id: null,
          creation_time: '2021-09-13T09:09:38Z',
          private_groups: '[]',
        },
        created_dt: '2021-09-13T09:09:38Z',
        updated_dt: '2021-09-13T09:09:38Z',
      },
      {
        uuid: 'b6e8870e-5f7a-46d7-bb2f-40910b75b6a4',
        type: 'BUGZILLA',
        external_system_id: '15302351',
        order: 1,
        meta_attr: {
          id: '15302351',
          tags: '[]',
          text: 'Dictum maecenas congue quis quam phasellus aenean',
          time: '2021-09-13T09:12:33Z',
          count: '1',
          bug_id: '1984541',
          creator: 'ex-maple@example.com',
          creator_id: '412888',
          is_private: 'True',
          attachment_id: null,
          creation_time: '2021-09-13T09:12:33Z',
          private_groups: "['nunya']",
        },
        created_dt: '2021-09-13T09:12:33Z',
        updated_dt: '2021-09-13T09:12:33Z',
      },
      {
        uuid: 'dffc4966-3442-46a4-98b8-2fd542addba0',
        type: 'BUGZILLA',
        external_system_id: '15392392',
        order: 2,
        meta_attr: {
          id: '15392392',
          tags: '[]',
          text: 'Dictum maecenas congue quis quam phasellus aenean',
          time: '2022-03-12T08:34:13Z',
          count: '2',
          bug_id: '1984541',
          creator: 'former-maple@example.com',
          creator_id: '171532',
          is_private: 'True',
          attachment_id: null,
          creation_time: '2022-03-12T08:34:13Z',
          private_groups: "['nunya']",
        },
        created_dt: '2022-03-12T08:34:13Z',
        updated_dt: '2022-03-12T08:34:13Z',
      },
      {
        uuid: '7edd4365-d12e-4873-a1ea-1cf2f7110391',
        type: 'BUGZILLA',
        external_system_id: '15596524',
        order: 3,
        meta_attr: {
          id: '15596524',
          tags: '[]',
          text: 'Dictum maecenas congue quis quam phasellus aenean',
          time: '2023-07-13T01:07:34Z',
          count: '3',
          bug_id: '1984541',
          creator: 'former-maple@example.com',
          creator_id: '171532',
          is_private: 'True',
          attachment_id: null,
          creation_time: '2023-07-13T01:07:34Z',
          private_groups: "['nunya']",
        },
        created_dt: '2023-07-13T01:07:34Z',
        updated_dt: '2023-07-13T01:07:34Z',
      },
      {
        uuid: '8f5b04e2-d62e-4330-b42f-634d41457033',
        type: 'BUGZILLA',
        external_system_id: '15607332',
        order: 4,
        meta_attr: {
          id: '15607332',
          tags: '[]',
          text: 'Dictum maecenas congue quis quam phasellus aenean',
          time: '2023-07-13T02:06:48Z',
          count: '4',
          bug_id: '1984541',
          creator: 'former-maple@example.com',
          creator_id: '171532',
          is_private: 'True',
          attachment_id: null,
          creation_time: '2023-07-13T02:06:48Z',
          private_groups: "['nunya']",
        },
        created_dt: '2023-07-13T02:06:48Z',
        updated_dt: '2023-07-13T02:06:48Z',
      },
      {
        uuid: 'cfc38ae1-7afe-41fe-b66a-5b46acbaba3a',
        type: 'BUGZILLA',
        external_system_id: '15614647',
        order: 5,
        meta_attr: {
          id: '15614647',
          tags: '[]',
          text: 'Dictum maecenas congue quis quam phasellus aenean',
          time: '2023-07-13T02:39:44Z',
          count: '5',
          bug_id: '1984541',
          creator: 'former-maple@example.com',
          creator_id: '171532',
          is_private: 'True',
          attachment_id: null,
          creation_time: '2023-07-13T02:39:44Z',
          private_groups: "['nunya']",
        },
        created_dt: '2023-07-13T02:39:44Z',
        updated_dt: '2023-07-13T02:39:44Z',
      },
    ],
    meta_attr: { bz_id: '1984541' },
    package_versions: [],
    acknowledgments: [],
    references: [],
    cvss_scores: [],
    embargoed: false,
    created_dt: '2021-09-13T09:09:38Z',
    updated_dt: '2023-12-06T17:12:21Z',
    classification: { workflow: 'DEFAULT', state: 'REVIEW' },
    group_key: '',
    owner: '',
    task_key: '',
    team_id: '',
    dt: '2024-01-17T22:31:19.131516Z',
    revision: 'b61be72c3b93b2f307d8f4ebfd7db64ec4c81f9c',
    version: '3.5.2',
    env: 'stage',
  };
}
