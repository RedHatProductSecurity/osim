import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { flushPromises, mount, VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import LabelEditable from '@/components/widgets/LabelEditable.vue';
import IssueFieldState from '@/components/IssueFieldState.vue';
import FlawForm from '@/components/FlawForm.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import CvssCalculator from '@/components/CvssCalculator.vue';
import FlawFormOwner from '@/components/FlawFormOwner.vue';
import LabelTagsInput from '@/components/widgets/LabelTagsInput.vue';
import LabelStatic from '@/components/widgets/LabelStatic.vue';

import { blankFlaw } from '@/composables/useFlawModel';

import { server } from '@/__tests__/setup';
import { flawSources } from '@/types/zodFlaw';
import { useToastStore } from '@/stores/ToastStore';
import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';
import {
  Source521Enum,
} from '@/generated-client';

import IssueFieldEmbargo from '../IssueFieldEmbargo.vue';
import { osimFullFlawTest } from './test-suite-helpers';

const FLAW_BASE_URI = '/osidb/api/v1/flaws';
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

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...(actual as any),
    useRouter: vi.fn(),
  };
});

vi.mock('@/services/TrackerService', () => {
  return {
    getSuggestedTrackers: vi.fn(() => Promise.resolve([])),
  };
});

vi.mock('@/composables/useTrackers', () => {
  return {
    suggestedTrackers: { value: [] },
    getUpdateStreamsFor: vi.fn(() => []),
    useTrackers: vi.fn(() => []),
  };
});

describe('flawForm', () => {
  function mountWithProps(props: typeof FlawForm.$props) {
    subject = mount(FlawForm, {
      plugins: [useToastStore()],
      props,
      directives: {
        'osim-loading': LoadingAnimationDirective,
      },
      global: {
        stubs: {
          // osimFormatDate not defined on test run, so we need to stub it
          // EditableDate: true,
          RouterLink: true,
          AffectExpandableForm: true,
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

    (useRouter as Mock).mockReturnValue({
      currentRoute: { value: { fullPath: '/flaws/uuiddddd' } },
    });

    subject = mount(FlawForm, {
      plugins: [useToastStore()],
      directives: {
        'osim-loading': LoadingAnimationDirective,
      },
      // shallow: true,
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
          AffectExpandableForm: true,

        },
      },
    });
  });

  beforeEach(() => {
    server.use(putHandler);
  });

  it('mounts and renders', async () => {
    expect(subject.exists()).toBe(true);
    expect(subject.vm).toBeDefined();
  });

  osimFullFlawTest('shows the expected fields in edit mode', async ({ flaw }) => {
    mountWithProps({ flaw: flaw, mode: 'edit' });

    const titleField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Title');
    expect(titleField?.exists()).toBe(true);

    const componentsField = subject
      .findAllComponents(LabelTagsInput)
      .find(component => component.props().label === 'Components');
    expect(componentsField?.exists()).toBe(true);

    const cveIdField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'CVE ID');
    expect(cveIdField?.exists()).toBe(true);

    const impactField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Impact');
    expect(impactField?.exists()).toBe(true);
    const impactOptions = impactField.findAll('option').map(item => item.text());
    expect(impactOptions).toEqual([
      'CRITICAL',
      'IMPORTANT',
      'MODERATE',
      'LOW',
      '',
    ]);

    const cvssV3Field = subject
      .findAllComponents(CvssCalculator)
      .find(component => component.text().includes('CVSSv3'));
    expect(cvssV3Field?.exists()).toBe(true);

    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);

    const cweIdField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'CWE ID');
    expect(cweIdField?.exists()).toBe(true);

    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    expect(sourceField?.exists()).toBe(true);
    const sourceOptionEls = sourceField.findAll('option');
    const sourceOptionCount = Object.keys(Source521Enum).length + 1;
    expect(sourceOptionEls.length).toBe(sourceOptionCount);

    const workflowStateField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'State');
    expect(workflowStateField?.exists()).toBe(true);

    const incidentStateField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Incident State');
    expect(incidentStateField?.exists()).toBe(true);

    const reportedDateField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Reported Date');
    expect(reportedDateField?.exists()).toBe(true);

    const publicDateField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Public Date');
    expect(publicDateField?.exists()).toBe(true);

    const embargoedField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'Embargoed');
    expect(embargoedField?.exists()).toBe(true);

    const assigneeField = subject.findComponent(FlawFormOwner);
    expect(assigneeField?.exists()).toBe(true);

    const comment0Field = subject
      .findAllComponents(LabelTextarea)
      .find(component => component.props().label === 'Comment#0');
    expect(comment0Field?.exists()).toBe(true);
    expect(comment0Field?.props().disabled).toBe(true);
  });

  osimFullFlawTest('shows the expected fields in create mode', async ({ flaw }) => {
    mountWithProps({ flaw: flaw, mode: 'create' });

    const titleField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Title');
    expect(titleField?.exists()).toBe(true);

    const componentsField = subject
      .findAllComponents(LabelTagsInput)
      .find(component => component.props().label === 'Components');
    expect(componentsField?.exists()).toBe(true);

    const cveIdField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'CVE ID');
    expect(cveIdField?.exists()).toBe(true);

    const impactField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Impact');
    expect(impactField?.exists()).toBe(true);

    const cvssV3Field = subject
      .findAllComponents(CvssCalculator)
      .find(component => component.html().includes('CVSSv3'));
    expect(cvssV3Field?.exists()).toBe(true);

    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);

    const cweIdField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'CWE ID');
    expect(cweIdField?.exists()).toBe(true);

    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    expect(sourceField?.exists()).toBe(true);

    const incidentStateField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Incident State');
    expect(incidentStateField?.exists()).toBe(true);

    const reportedDateField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Reported Date');
    expect(reportedDateField?.exists()).toBe(true);

    const publicDateField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Public Date');
    expect(publicDateField?.exists()).toBe(true);

    const embargoedField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'Embargoed');
    expect(embargoedField?.exists()).toBe(true);

    const comment0Field = subject
      .findAllComponents(LabelTextarea)
      .find(component => component.props().label === 'Comment#0');
    expect(comment0Field?.exists()).toBe(true);
    expect(comment0Field?.props().disabled).toBe(false);
  });

  osimFullFlawTest('renders the description field', async ({ flaw }) => {
    flaw.major_incident_state = '';
    mountWithProps({ flaw, mode: 'edit' });
    const descriptionField = subject
      .findAllComponents(LabelTextarea)
      .find(component => component.props().label === 'Description');
    expect(descriptionField?.exists()).toBe(true);
  });

  it('triggers validations for blank flaw', async () => {
    const flaw = blankFlaw();
    mountWithProps({ flaw, mode: 'create' });
    const vm = subject.findComponent(FlawForm).vm as any;
    expect(vm.errors.title).not.toBe(null);
    expect(vm.errors.component).not.toBe(null);
    expect(vm.errors.impact).not.toBe(null);
    expect(vm.errors.source).not.toBe(null);
    expect(vm.errors.comment_zero).not.toBe(null);

    const titleField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Title')
      ?.find('.is-invalid');
    expect(titleField?.exists()).toBe(true);

    const componentsField = subject
      .findAllComponents(LabelTagsInput)
      .find(component => component.props().label === 'Components')
      ?.find('.is-invalid');
    expect(componentsField?.exists()).toBe(true);

    const invalidImpactField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Impact')
      ?.find('.is-invalid');
    expect(invalidImpactField?.exists()).toBe(true);

    const invalidSourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source')
      ?.find('.is-invalid');
    expect(invalidSourceField?.exists()).toBe(true);

    vm.reported_dt = '';
    const invalidReportedDateField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Reported Date')
      ?.find('.is-invalid');
    expect(invalidReportedDateField?.exists()).toBe(false);

    const invalidPublicDateField = subject
      .findAllComponents(LabelEditable)
      .find(component => component.props().label === 'Public Date')
      ?.find('.is-invalid');
    expect(invalidPublicDateField?.exists()).toBe(true);

    const invalidComment0Field = subject
      .findAllComponents(LabelTextarea)
      .find(component => component.props().label === 'Comment#0')
      ?.find('.is-invalid');
    expect(invalidComment0Field?.exists()).toBe(true);
  });

  osimFullFlawTest('triggers validations for the description field', async ({ flaw }) => {
    flaw.major_incident_state = '';
    mountWithProps({ flaw, mode: 'edit' });
    const descriptionField = subject
      .findAllComponents(LabelTextarea)
      .find(component => component.props().label === 'Description');
    expect(descriptionField?.exists()).toBe(true);
    const vm = subject.findComponent(FlawForm).vm as any;
    vm.flaw.requires_cve_description = 'REQUESTED';
    vm.flaw.cve_description = 'I am a spooky CVE';
    expect(vm.errors.cve_description).toBe(null);
    vm.flaw.cve_description = '';
    expect(vm.errors.cve_description).toBe('Description cannot be blank if requested or approved.');
    vm.flaw.major_incident_state = 'APPROVED';
    expect(vm.errors.cve_description).toBe('Description must be approved for Major Incidents.');
  });

  osimFullFlawTest('displays correct Owner field value from props', async ({ flaw }) => {
    flaw.owner = 'test owner';
    mountWithProps({ flaw, mode: 'edit' });
    const assigneeField = subject.findComponent(FlawFormOwner);
    expect(assigneeField?.find('span.form-label').text()).toBe('Owner');
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
      .find(component => component.text().includes('State'));
    expect(
      workflowStateField
        ?.findAll('button')
        ?.find(el => el.text() === 'Reject')
        ?.text(),
    ).toBe('Reject');
    expect(
      workflowStateField
        ?.findAll('button')
        ?.find(el => el.text().includes('Promote to'))
        ?.text(),
    ).toBe('Promote to Triage');
  });

  it('shows a modal for reject button clicks', async () => {
    const workflowStateField = subject
      .findAllComponents(IssueFieldState)
      .find(component => component.text().includes('State'));
    const rejectButton = workflowStateField?.findAll('button')?.find(el => el.text() === 'Reject');
    await rejectButton?.trigger('click');
    expect(subject.find('.modal-dialog').exists()).toBe(true);
  });

  osimFullFlawTest('sends a mocked PUT request with an updated owner', async ({ flaw }) => {
    flaw.owner = 'networking test owner';
    const result = await mockedPutFlaw(flaw.uuid, flaw);
    expect(result.owner).toBe('networking test owner');
  });

  it('shows an explanation message when nvd score and Rh score mismatch', async () => {
    const cvssScoreError = subject.find('.cvss-score-mismatch');
    expect(cvssScoreError?.exists()).toBe(true);
    expect(cvssScoreError?.text()).toBe('Explain non-obvious CVSSv3 score metrics');
  });

  it('shows a highlighted nvdCvssField value when nvd score and Rh score mismatch', async () => {
    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);
    const spanWithClass = nvdCvssField?.find('span.text-primary');
    const allHighlightedSpan = nvdCvssField?.findAll('span.text-primary');
    expect(spanWithClass?.exists()).toBe(true);
    expect(allHighlightedSpan?.length).toBe(5);
  });

  osimFullFlawTest('if embargoed and public date is in the past, it returns an error', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = '2022-02-01';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('An embargoed flaw must have a public date in the future.');
  });

  osimFullFlawTest('if embargoed and public date is later today (in the future) it returns null', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T23:00:00Z';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('if embargoed and public date is in the future, it returns null', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T23:00:00Z';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('if NOT embargoed and public date is in the future, it returns an error ', async ({ flaw }) => {
    flaw.embargoed = false;
    flaw.unembargo_dt = '3000-01-01';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('A public flaw cannot have a public date in the future.');
  });

  osimFullFlawTest('if NOT embargoed and public date is today or in the past, it returns null', async ({ flaw }) => {
    flaw.embargoed = false;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T00:00:00Z';
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('if NOT embargoed and public date is null, it returns an error message', async ({ flaw }) => {
    flaw.embargoed = false;
    flaw.unembargo_dt = null;
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('A public flaw must have a public date set.');
  });

  osimFullFlawTest('if embargoed and public date is null, it returns null', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = null;
    mountWithProps({ flaw, mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('sets public date if empty when unembargo button is clicked', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = null;
    mountWithProps({ flaw, mode: 'edit' });
    await flushPromises();
    subject.findComponent(IssueFieldEmbargo).find('.osim-unembargo-button').trigger('click');

    expect(flaw.unembargo_dt).not.toBe(null);
  });

  osimFullFlawTest('should show only allowed sources in edit mode', async ({ flaw }) => {
    mountWithProps({ flaw, mode: 'edit' });
    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    const options = sourceField.findAll('option');
    expect(options.length).toBe(flawSources.length);
    const disabledOptions = sourceField.findAll('option[hidden]');
    expect(disabledOptions.length).not.toBe(0);
  });

  osimFullFlawTest('should show all sources in create mode', async ({ flaw }) => {
    mountWithProps({ flaw, mode: 'create' });
    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    const options = sourceField.findAll('option');
    expect(options.length).toBe(flawSources.length);
    const disabledOptions = sourceField.findAll('option[hidden]');
    expect(disabledOptions.length).not.toBe(0);
  });

  osimFullFlawTest('should show a link to bugzilla if ID exists', async ({ flaw }) => {
    mountWithProps({ flaw, mode: 'edit' });

    const bugzillaLink = subject.find('.osim-bugzilla-link');
    expect(bugzillaLink.exists()).toBe(true);
  });

  osimFullFlawTest('should not show a link to bugzilla if ID does not exists', async ({ flaw }) => {
    flaw.meta_attr = {};
    mountWithProps({ flaw, mode: 'edit' });

    const bugzillaLink = subject.find('.osim-bugzilla-link');
    expect(bugzillaLink.exists()).toBe(false);
  });

  osimFullFlawTest('should show CreatedDate on Flaw Edit', async ({ flaw }) => {
    mountWithProps({ flaw, mode: 'edit' });
    const createdAtField = subject
      .findAllComponents(LabelStatic)
      .find(component => component.props().label === 'Created Date');
    expect(createdAtField?.exists()).toBeTruthy();
    const formEL = createdAtField.find('span.form-control');
    expect(formEL?.exists()).toBeTruthy();
    expect(formEL.text()).toBe('2021-09-13 09:09 UTC');
  });

  osimFullFlawTest('should not show CreatedDate on Flaw Creation', async ({ flaw }) => {
    mountWithProps({ flaw, mode: 'new' });
    const createdAtField = subject
      .findAllComponents(LabelStatic)
      .find(component => component.props().label === 'Created Date');
    expect(createdAtField?.exists()).toBeFalsy();
  });

  osimFullFlawTest('should show border when flaw is embargoed', async ({ flaw }) => {
    flaw.embargoed = true;
    mountWithProps({ flaw, mode: 'edit' });
    let flawForm = subject.find('div.osim-flaw-form-embargoed');
    expect(flawForm?.exists()).toBeTruthy();
    flaw.embargoed = false;
    mountWithProps({ flaw, mode: 'edit' });
    flawForm = subject.find('div.osim-flaw-form-embargoed');
    expect(flawForm?.exists()).toBeFalsy();
  });
});

function mockedPutFlaw(uuid: string, flawObject: Record<any, any>) {
  return fetch(`${FLAW_BASE_URI}/${uuid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flawObject),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('🚨 Mocked PUT failed');
      }
      return response.json();
    })
    .catch(e => console.error('🚨 Mocked PUT failed due to', e.message));
}
