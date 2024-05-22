import { type ZodFlawType } from '@/types/zodFlaw';
import axios from 'axios';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, type Mock } from 'vitest';
import {
  Source642Enum
} from '../../generated-client';
import { mount, VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useToastStore } from '@/stores/ToastStore';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import IssueFieldState from '@/components/IssueFieldState.vue';
import FlawForm from '../FlawForm.vue';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import LabelDiv from '../widgets/LabelDiv.vue';
import LabelSelect from '../widgets/LabelSelect.vue';
import LabelCollapsible from '../widgets/LabelCollapsible.vue';
import LabelTextarea from '../widgets/LabelTextarea.vue';
import CvssCalculator from '../CvssCalculator.vue';
import FlawFormAssignee from '../FlawFormAssignee.vue';

const FLAW_BASE_URI = '/osidb/api/v1/flaws';
// const FLAW_BASE_URI = `http://localhost:5173/tests/3ede0314-a6c5-4462-bcf3-b034a15cf106`;
const putHandler = http.put(`${FLAW_BASE_URI}/:id`, async ({ request }) => {
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
});

const server = setupServer(putHandler);

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...(actual as any),
    useRouter: vi.fn(),
  };
});

describe('FlawForm', () => {
  function mountWithProps(props: typeof FlawForm.$props = { flaw: sampleFlaw(), mode: 'edit' }) {
    subject = mount(FlawForm, {
      plugins: [useToastStore()],
      props,
      global: {
        stubs: {
          // osimFormatDate not defined on test run, so we need to stub it
          EditableDate: true,
          RouterLink: true,
        },
      },
    });
  }
  let subject: VueWrapper<InstanceType<typeof FlawForm>>;
  beforeAll(() => {
    // Store below depends on global pinia test instance
    createTestingPinia({
      initialState: {
        toasts: [],
      },
    });

    server.listen({ onUnhandledRequest: 'error' });

    (useRouter as Mock).mockReturnValue({
      currentRoute: { value: { fullPath: '/flaws/uuiddddd' } },
    });

    subject = mount(FlawForm, {
      plugins: [useToastStore()],
      // shallow: true,
      props: {
        flaw: sampleFlaw(),
        mode: 'edit',
      },
      global: {
        mocks: {
          $beforeEach: (a: any) => a,

          // router,
          // router: vi.fn().mockReturnValue('mock flaw osim link'),
        },
        stubs: {
          // osimFormatDate not defined on test run, so we need to stub it
          EditableDate: true,
          RouterLink: true,
        },
      },
    });
  });

  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('mounts and renders', async () => {
    expect(subject.exists()).toBe(true);
    expect(subject.vm).toBeDefined();
  });

  it('shows the expected fields in edit mode', async () => {
    mountWithProps({ flaw: sampleFlaw(), mode: 'edit' });

    const titleField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Title');
    expect(titleField?.exists()).toBe(true);

    const componentField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Component');
    expect(componentField?.exists()).toBe(true);

    const cveIdField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'CVE ID');
    expect(cveIdField?.exists()).toBe(true);

    const impactField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'Impact');
    expect(impactField?.exists()).toBe(true);

    const cvssV3Field = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.text().includes('CVSSv3'));
    expect(cvssV3Field?.exists()).toBe(true);

    const cvssV3ScoreField = subject
      .findAllComponents(CvssCalculator)
      .find((component) => component.html().includes('CVSSv3 Score'));
    expect(cvssV3ScoreField?.exists()).toBe(true);

    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find((component) => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);

    const cweIdField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'CWE ID');
    expect(cweIdField?.exists()).toBe(true);

    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'CVE Source');
    expect(sourceField?.exists()).toBe(true);
    const sourceOptionEls = sourceField.findAll('option');
    const sourceOptionCount = Object.keys(Source642Enum).length + 1;
    expect(sourceOptionEls.length).toBe(sourceOptionCount);

    const workflowStateField = subject
      .findAllComponents(LabelDiv)
      .find((component) => component.props().label === 'State');
    expect(workflowStateField?.exists()).toBe(true);

    const incidentStateField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'Incident State');
    expect(incidentStateField?.exists()).toBe(true);

    const reportedDateField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Reported Date');
    expect(reportedDateField?.exists()).toBe(true);

    const publicDateField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Public Date');
    expect(publicDateField?.exists()).toBe(true);

    const embargoedField = subject
      .findAllComponents(LabelDiv)
      .find((component) => component.props().label === 'Embargoed');
    expect(embargoedField?.exists()).toBe(true);

    const assigneeField = subject.findComponent(FlawFormAssignee);
    expect(assigneeField?.exists()).toBe(true);

    const trackers = subject
      .findAllComponents(LabelCollapsible)
      .find((component) => component.props().label.startsWith('Trackers'));
    expect(trackers?.exists()).toBe(true);

    const comment0Field = subject
      .findAllComponents(LabelTextarea)
      .find((component) => component.props().label === 'Comment#0');
    expect(comment0Field?.exists()).toBe(true);
    expect(comment0Field?.props().disabled).toBe(true);
  });

  it('shows the expected fields in create mode', async () => {
    mountWithProps({ flaw: sampleFlaw(), mode: 'create' });

    const titleField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Title');
    expect(titleField?.exists()).toBe(true);

    const componentField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Component');
    expect(componentField?.exists()).toBe(true);

    const cveIdField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'CVE ID');
    expect(cveIdField?.exists()).toBe(true);

    const impactField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'Impact');
    expect(impactField?.exists()).toBe(true);

    const cvssV3Field = subject
      .findAllComponents(CvssCalculator)
      .find((component) => component.html().includes('CVSSv3'));
    expect(cvssV3Field?.exists()).toBe(true);

    const cvssV3ScoreField = subject
      .findAllComponents(CvssCalculator)
      .find((component) => component.html().includes('CVSSv3 Score'));
    expect(cvssV3ScoreField?.exists()).toBe(true);

    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find((component) => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);

    const cweIdField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'CWE ID');
    expect(cweIdField?.exists()).toBe(true);

    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'CVE Source');
    expect(sourceField?.exists()).toBe(true);

    const incidentStateField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'Incident State');
    expect(incidentStateField?.exists()).toBe(true);

    const reportedDateField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Reported Date');
    expect(reportedDateField?.exists()).toBe(true);

    const publicDateField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Public Date');
    expect(publicDateField?.exists()).toBe(true);

    const embargoedField = subject
      .findAllComponents(LabelDiv)
      .find((component) => component.props().label === 'Embargoed');
    expect(embargoedField?.exists()).toBe(true);

    const trackers = subject
      .findAllComponents(LabelCollapsible)
      .find((component) => component.props().label.startsWith('Trackers'));
    expect(trackers).toBe(undefined);

    const comment0Field = subject
      .findAllComponents(LabelTextarea)
      .find((component) => component.props().label === 'Comment#0');
    expect(comment0Field?.exists()).toBe(true);
    expect(comment0Field?.props().disabled).toBe(false);
  });

  it('displays correct Assignee field value from props', async () => {
    const flaw = sampleFlaw();
    flaw.owner = 'test owner';
    mountWithProps({ flaw, mode: 'edit' });
    const assigneeField = subject.findComponent(FlawFormAssignee);
    expect(assigneeField?.find('span.form-label').text()).toBe('Assignee');
    expect(assigneeField?.props().modelValue).toBe('test owner');
    expect(assigneeField?.html()).toContain('test owner');
  });

  it('displays correct State field value from props', async () => {
    const workflowStateField = subject.findComponent(IssueFieldState);
    expect(workflowStateField?.findComponent(LabelDiv).props().label).toBe('State');
    expect(workflowStateField?.props().classification.state).toBe('NEW');
  });

  it('displays promote and reject buttons for state', async () => {
    const workflowStateField = subject
      .findAllComponents(IssueFieldState)
      .find((component) => component.text().includes('State'));
    expect(
      workflowStateField
        ?.findAll('button')
        ?.find((el) => el.text() === 'Reject')
        ?.text(),
    ).toBe('Reject');
    expect(
      workflowStateField
        ?.findAll('button')
        ?.find((el) => el.text().includes('Promote to'))
        ?.text(),
    ).toBe('Promote to Triage');
  });

  it('shows a modal for reject button clicks', async () => {
    const workflowStateField = subject
      .findAllComponents(IssueFieldState)
      .find((component) => component.text().includes('State'));
    const rejectButton = workflowStateField?.findAll('button')?.find((el) => el.text() === 'Reject');
    await rejectButton?.trigger('click');
    expect(subject.find('.modal-dialog').exists()).toBe(true);
  });

  it('sends a mocked PUT request with an updated owner', async () => {
    const flaw = sampleFlaw();
    flaw.owner = 'networking test owner';
    const result = await mockedPutFlaw(flaw.uuid, flaw);
    expect(result.owner).toBe('networking test owner');
  });

  it('displays correct Cvss3 calculator link for cvss3 value', async () => {
    const flaw = sampleFlaw();
    flaw.cvss3 = '2.2/CVSS:3.1/AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:N/A:N';

    flaw.cvss_scores = [
      {
        comment: 'The CVSS is as it is and that is it.',
        cvss_version: 'V3',
        flaw: '3dcaf61a-48a7-4483-b1c8-92f56f829abe',
        issuer: 'RH',
        score: 2.2,
        uuid: '23ea1399-219a-4183-ad74-37edd869b2f0',
        vector: 'CVSS:3.1/AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:N/A:N',
        embargoed: false,
        created_dt: '2021-08-02T10:49:35Z',
        updated_dt: '2024-02-28T14:51:02Z',
      },
    ];
  });

  it('displays correct CVSSv3 calculator link for empty value', async () => {
    const flaw = sampleFlaw();
    flaw.cvss_scores = [];
    subject = mount(FlawForm, {
      plugins: [useToastStore()],
      props: {
        flaw,
        mode: 'edit',
      },
      global: {
        mocks: {
          $beforeEach: (a: any) => a,
        },
        stubs: {
          EditableDate: true,
          RouterLink: true,
        },
      },
    });
  });

  it('displays correct CVSSv3 calculator link for CVSSv3 value', async () => {
    const flaw = sampleFlaw();
    subject = mount(FlawForm, {
      plugins: [useToastStore()],
      props: {
        flaw,
        mode: 'edit',
      },
      global: {
        mocks: {
          $beforeEach: (a: any) => a,
        },
        stubs: {
          EditableDate: true,
          RouterLink: true,
        },
      },
    });
  });

  it('shows a error message when nvd score and Rh score mismatch', async () => {
    const cvssScoreError = subject.find('span.cvss-score-error');
    expect(cvssScoreError?.exists()).toBe(true);
    expect(cvssScoreError?.text()).toBe('Explain non-obvious CVSSv3 score metrics');
  });

  it('shows a highlighted nvdCvssField value when nvd score and Rh score mismatch', async () => {
    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find((component) => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);
    const spanWithClass = nvdCvssField?.find('span.text-primary');
    const allHighlightedSpan = nvdCvssField?.findAll('span.text-primary');
    expect(spanWithClass?.exists()).toBe(true);
    expect(allHighlightedSpan.length).toBe(6);
  });

  it('if embargoed and public date is in the past, it returns an error', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = true;
    flaw.unembargo_dt = '2022-02-01';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('An embargoed flaw must have a public date in the future.');
  });

  it('if embargoed and public date is later today (in the future) it returns null', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = true;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T23:00:00Z';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  it('if embargoed and public date is in the future, it returns null', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = true;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T23:00:00Z';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  it('if NOT embargoed and public date is in the future, it returns an error ', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = false;
    flaw.unembargo_dt = '3000-01-01';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('A public flaw cannot have a public date in the future.');
  });

  it('if NOT embargoed and public date is today or in the past, it returns null', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = false;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T00:00:00Z';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  it('if NOT embargoed and public date is null, it returns an error message', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = false;
    flaw.unembargo_dt = null;
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('A public flaw must have a public date set.');
  });

  it('if embargoed and public date is null, it returns null', async () => {
    const flaw = sampleFlaw();
    flaw.embargoed = true;
    flaw.unembargo_dt = null;
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  it('show set summary, statement, mitigation values correctly after clicking remove buttons', async () => {
    const flaw = sampleFlaw();
    flaw.summary = 'summary';
    flaw.statement = 'statement';
    flaw.mitigation = 'mitigation';
    mountWithProps({ flaw, mode: 'edit' });
    const buttonGroups = subject.find('div.d-flex.gap-3.mb-3').findAll('button.btn.btn-secondary');
    const removeSummaryButton = buttonGroups[0];
    expect(removeSummaryButton.element?.textContent).toBe('Remove Description');
    const removeStatementButton = buttonGroups[1];
    expect(removeStatementButton.element?.textContent).toBe('Remove Statement');
    const removeMitigationButton = buttonGroups[2];
    expect(removeMitigationButton.element?.textContent).toBe('Remove Mitigation');
    await removeSummaryButton.trigger('click');
    await removeStatementButton.trigger('click');
    await removeMitigationButton.trigger('click');
    expect((subject.vm as any).flaw.summary).toBe('');
    expect((subject.vm as any).flaw.statement).toBe('');
    expect((subject.vm as any).flaw.mitigation).toBe('');
  });
});



function mockedPutFlaw(uuid: string, flawObject: Record<any, any>) {
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

function sampleFlaw(): ZodFlawType {
  return {
    uuid: '3ede0314-a6c5-4462-bcf3-b034a15cf106',
    type: 'VULNERABILITY',
    cve_id: 'CVE-2007-97239',
    // resolution: '',
    impact: 'LOW',
    component: 'reality.',
    title: 'sample title',
    trackers: [],
    description: 'comment',
    summary: 'I am a spooky CVE',
    requires_summary: 'APPROVED',
    statement: 'Statement for None',
    cwe_id: 'CWE-1',
    unembargo_dt: '[native Date Thu Nov 30 2023 21:52:48 GMT-0500 (Eastern Standard Time)]',
    source: 'GIT',
    reported_dt: '[native Date Sun Oct 05 1975 03:45:17 GMT-0400 (Eastern Daylight Time)]',
    mitigation: 'CVE mitigation',
    cvss2: '',
    cvss2_score: null,
    nvd_cvss2: '',
    cvss3: '',
    cvss3_score: null,
    nvd_cvss3: '',
    // is_major_incident: true,
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
        // cvss2: '',
        // cvss2_score: null,
        // cvss3: '',
        // cvss3_score: null,
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
          is_private: false,
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
          is_private: true,
          attachment_id: null,
          creation_time: '2021-09-13T09:12:33Z',
          private_groups: '[\'nunya\']',
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
          private_groups: '[\'nunya\']',
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
          private_groups: '[\'nunya\']',
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
          private_groups: '[\'nunya\']',
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
          // is_private: 'True',
          is_private: true,
          attachment_id: null,
          creation_time: '2023-07-13T02:39:44Z',
          private_groups: '[\'nunya\']',
        },
        created_dt: '2023-07-13T02:39:44Z',
        updated_dt: '2023-07-13T02:39:44Z',
      },
    ],
    meta_attr: { bz_id: '1984541' },
    // package_versions: [],
    acknowledgments: [],
    references: [],
    cvss_scores: [
      {
        comment: 'The CVSS is as it is and that is it.',
        cvss_version: 'V3',
        flaw: 'beeeeep',
        issuer: 'RH',
        score: 2.2,
        uuid: 'cvsss-beeeep',
        vector: 'CVSS:3.1/AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:N/A:N',
        embargoed: false,
        created_dt: '2021-08-02T10:49:35Z',
        updated_dt: '2024-03-04T14:27:02Z',
      },
      {
        comment: 'The CVSS is as it is and that is it.',
        cvss_version: 'V3',
        flaw: 'beeeeep',
        issuer: 'NIST',
        score: 4,
        uuid: 'cvsss-beeeep',
        vector: 'CVSS:3.1/AV:N/AC:H/PR:E/UI:N/S:U/C:N/I:L/A:R',
        embargoed: false,
        created_dt: '2021-08-02T10:49:35Z',
        updated_dt: '2024-03-04T14:27:02Z',
      },
    ],
    embargoed: false,
    // created_dt: '2021-09-13T09:09:38Z',
    updated_dt: '2023-12-06T17:12:21Z',
    classification: { workflow: 'DEFAULT', state: 'NEW' },
    // group_key: '',
    owner: '',
    // task_key: '',
    team_id: '',
    // dt: '2024-01-17T22:31:19.131516Z',
    // revision: 'b61be72c3b93b2f307d8f4ebfd7db64ec4c81f9c',
    // version: '3.5.2',
    // env: 'stage',
  };
}
