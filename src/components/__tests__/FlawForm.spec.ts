import { flawSources } from '@/types/zodFlaw';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, type Mock } from 'vitest';
import {
  Source642Enum
} from '@/generated-client';
import { useRouter } from 'vue-router';
import { DateTime } from 'luxon';

import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';
import { mount, VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useToastStore } from '@/stores/ToastStore';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import IssueFieldState from '@/components/IssueFieldState.vue';
import FlawForm from '@/components/FlawForm.vue';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import CvssCalculator from '@/components/CvssCalculator.vue';
import FlawFormAssignee from '@/components/FlawFormAssignee.vue';
import LabelTagsInput from '@/components/widgets/LabelTagsInput.vue';
import { blankFlaw } from '@/composables/useFlawModel';
import { sampleFlaw } from './SampleData';


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

vi.mock('@/services/TrackerService', () => {
  return {
    getAvailableUpdateStreams: vi.fn(() => Promise.resolve([])),
  };
});



describe('FlawForm', () => {
  function mountWithProps(props: typeof FlawForm.$props = { flaw: sampleFlaw(), mode: 'edit' }) {
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
      directives: {
        'osim-loading': LoadingAnimationDirective,
      },
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

    const componentsField = subject
      .findAllComponents(LabelTagsInput)
      .find((component) => component.props().label === 'Components');
    expect(componentsField?.exists()).toBe(true);

    const cveIdField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'CVE ID');
    expect(cveIdField?.exists()).toBe(true);

    const impactField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'Impact');
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

    const componentsField = subject
      .findAllComponents(LabelTagsInput)
      .find((component) => component.props().label === 'Components');
    expect(componentsField?.exists()).toBe(true);

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

  it('renders the description field', async () => {
    const flaw = sampleFlaw();
    flaw.major_incident_state = '';
    mountWithProps({ flaw, mode: 'edit' });
    const descriptionField = subject
      .findAllComponents(LabelTextarea)
      .find((component) => component.props().label === 'Description');
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
      .find((component) => component.props().label === 'Title')
      ?.find('.is-invalid');
    expect(titleField?.exists()).toBe(true);

    const componentsField = subject
      .findAllComponents(LabelTagsInput)
      .find((component) => component.props().label === 'Components')
      ?.find('.is-invalid');
    expect(componentsField?.exists()).toBe(true);

    const invalidImpactField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'Impact')
      ?.find('.is-invalid');
    expect(invalidImpactField?.exists()).toBe(true);

    const invalidSourceField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'CVE Source')
      ?.find('.is-invalid');
    expect(invalidSourceField?.exists()).toBe(true);

    vm.reported_dt = '';
    const invalidReportedDateField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Reported Date')
      ?.find('.is-invalid');
    expect(invalidReportedDateField?.exists()).toBe(false);

    const invalidPublicDateField = subject
      .findAllComponents(LabelEditable)
      .find((component) => component.props().label === 'Public Date')
      ?.find('.is-invalid');
    expect(invalidPublicDateField?.exists()).toBe(true);

    const invalidComment0Field = subject
      .findAllComponents(LabelTextarea)
      .find((component) => component.props().label === 'Comment#0')
      ?.find('.is-invalid');
    expect(invalidComment0Field?.exists()).toBe(true);
  });

  it('triggers validations for the description field', async () => {
    const flaw = sampleFlaw();
    flaw.major_incident_state = '';
    mountWithProps({ flaw, mode: 'edit' });
    const descriptionField = subject
      .findAllComponents(LabelTextarea)
      .find((component) => component.props().label === 'Description');
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

  it('show set description, statement, mitigation values correctly after clicking remove buttons', async () => {
    const flaw = sampleFlaw();
    flaw.cve_description = 'description';
    flaw.statement = 'statement';
    flaw.mitigation = 'mitigation';
    mountWithProps({ flaw, mode: 'edit' });
    const buttonGroups = subject.find('div.d-flex.gap-3.mb-3').findAll('button.btn.btn-secondary');
    const removeDescriptionButton = buttonGroups[0];
    expect(removeDescriptionButton.element?.textContent).toBe('Remove Description');
    const removeStatementButton = buttonGroups[1];
    expect(removeStatementButton.element?.textContent).toBe('Remove Statement');
    const removeMitigationButton = buttonGroups[2];
    expect(removeMitigationButton.element?.textContent).toBe('Remove Mitigation');
    await removeDescriptionButton.trigger('click');
    await removeStatementButton.trigger('click');
    await removeMitigationButton.trigger('click');
    expect((subject.vm as any).flaw.cve_description).toBe('');
    expect((subject.vm as any).flaw.statement).toBe('');
    expect((subject.vm as any).flaw.mitigation).toBe('');
  });

  it('should show only allowed sources in edit mode', async () => {
    const flaw = sampleFlaw();
    mountWithProps({ flaw, mode: 'edit' });
    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'CVE Source');
    const options = sourceField.findAll('option');
    expect(options.length).toBe(flawSources.length);
    const disabledOptions = sourceField.findAll('option[hidden]');
    expect(disabledOptions.length).not.toBe(0);
  });

  it('should show all sources in create mode', async () => {
    const flaw = sampleFlaw();
    mountWithProps({ flaw, mode: 'create' });
    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find((component) => component.props().label === 'CVE Source');
    const options = sourceField.findAll('option');
    expect(options.length).toBe(flawSources.length);
    const disabledOptions = sourceField.findAll('option[hidden]');
    expect(disabledOptions.length).not.toBe(0);
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
    .catch((e) => console.error('🚨 Mocked PUT failed due to', e.message));
}
