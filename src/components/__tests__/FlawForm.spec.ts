import { nextTick } from 'vue';

import { describe, it, expect, vi } from 'vitest';
import { DateTime } from 'luxon';
import { flushPromises } from '@vue/test-utils';

import FlawWorkflowState from '@/components/FlawWorkflowState/FlawWorkflowState.vue';
import FlawForm from '@/components/FlawForm/FlawForm.vue';
import Nudge from '@/components/Nudge/Nudge.vue';
import CvssCalculator from '@/components/CvssCalculator/CvssCalculator.vue';
import FlawFormOwner from '@/components/FlawFormOwner/FlawFormOwner.vue';
import IssueFieldEmbargo from '@/components/IssueFieldEmbargo/IssueFieldEmbargo.vue';
import CweSelector from '@/components/CweSelector/CweSelector.vue';

import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import DropDownMenu from '@/widgets/DropDownMenu/DropDownMenu.vue';
import LabelEditable from '@/widgets/LabelEditable/LabelEditable.vue';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import LabelSelect from '@/widgets/LabelSelect/LabelSelect.vue';
import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import LabelTagsInput from '@/widgets/LabelTagsInput/LabelTagsInput.vue';
import LabelStatic from '@/widgets/LabelStatic/LabelStatic.vue';
import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective.js';
import { flawImpactEnum, FlawSourceEnumWithBlank, flawSources, type ZodFlawType } from '@/types/zodFlaw';
import { mountWithConfig } from '@/__tests__/helpers';
import { FlawClassificationStateEnum } from '@/generated-client';

import { osimFullFlawTest } from './test-suite-helpers';

vi.mock('@/services/TrackerService', () => {
  return {
    getSuggestedTrackers: vi.fn(() => Promise.resolve([])),
    trackerUrl: vi.fn(),
  };
});

vi.mock('@/composables/useTrackers', () => {
  return {
    suggestedTrackers: { value: [] },
    getUpdateStreamsFor: vi.fn(() => []),
    useTrackers: vi.fn(() => []),
  };
});

vi.mock('@/services/LabelsService');

vi.mock('@/composables/useJiraContributors', () => {
  return {
    default: vi.fn(() => ({
      contributors: { value: [] },
      isLoadingContributors: { value: false },
      loadJiraContributors: vi.fn(),
      saveContributors: vi.fn(),
      searchContributors: vi.fn(),
    })),
  };
});

vi.mock('@/services/JiraService', () => {
  return {
    getJiraComments: vi.fn(() => Promise.resolve({ response: { ok: true }, data: { comments: [] } })),
    getJiraIssue: vi.fn(() => Promise.resolve({ data: { fields: { customfield_12315950: [] } } })),
    searchJiraUsers: vi.fn(() => Promise.resolve({ data: { users: [] } })),
    jiraTaskUrl: vi.fn((id: string) => `http://jira-example.com/browse/${id}`),
    jiraUserUrl: vi.fn((name: string) => `http://jira-example.com/user/${name}`),
    postJiraComment: vi.fn(() => Promise.resolve({})),
  };
});

type FlawFormProps = InstanceType<typeof FlawForm>['$props'];

function mountWithProps(flaw: ZodFlawType, props: FlawFormProps) {
  const { setFlaw } = useFlaw();
  setFlaw(flaw);
  return mountWithConfig(FlawForm, {
    props,
    directives: {
      'osim-loading': LoadingAnimationDirective,
    },
    global: {
      stubs: {
        Teleport: true,
        RouterLink: true,
        AffectExpandableForm: true,
      },
    },
  });
};

describe('flawForm', () => {
  osimFullFlawTest('mounts and renders', ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });

    expect(subject.html()).toMatchSnapshot();
  });

  osimFullFlawTest('shows the expected fields in edit mode', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });

    const titleField = subject
      .findAllComponents(LabelDiv)
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
    const impactOptions = impactField?.findAll('option').map(item => item.text());
    expect(impactOptions).toEqual(['', ...Object.keys(flawImpactEnum)]);

    const cvssV3Field = subject
      .findAllComponents(CvssCalculator)
      .find(component => component.find('label[role="red-hat-cvss"]'));
    expect(cvssV3Field?.exists()).toBe(true);

    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);

    const cweIdField = subject
      .findAllComponents(CweSelector)
      .find(component => component.props().label === 'CWE ID');
    expect(cweIdField?.exists()).toBe(true);

    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    expect(sourceField?.exists()).toBe(true);
    const sourceOptionEls = sourceField?.findAll('option');
    const sourceOptionCount = Object.keys(FlawSourceEnumWithBlank).length;
    expect(sourceOptionEls?.length).toBe(sourceOptionCount);

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
    const subject = mountWithProps(flaw, { mode: 'create' });

    const titleField = subject
      .findAllComponents(LabelDiv)
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
      .find(component => component.find('label[role="red-hat-cvss"]'));
    expect(cvssV3Field?.exists()).toBe(true);

    const nvdCvssField = subject
      .findAllComponents(LabelDiv)
      .find(component => component.props().label === 'NVD CVSSv3');
    expect(nvdCvssField?.exists()).toBe(true);

    const cweIdField = subject
      .findAllComponents(CweSelector)
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
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const descriptionField = subject
      .findAllComponents(LabelTextarea)
      .find(component => component.props().label === 'Description');
    expect(descriptionField?.exists()).toBe(true);
  });

  it('triggers validations for blank flaw', async () => {
    const flaw = blankFlaw();
    const subject = mountWithProps(flaw, { mode: 'create' });
    const vm = subject.findComponent(FlawForm).vm as any;
    expect(vm.errors.title).not.toBe(null);
    expect(vm.errors.component).not.toBe(null);
    expect(vm.errors.impact).not.toBe(null);
    expect(vm.errors.source).not.toBe(null);
    expect(vm.errors.comment_zero).not.toBe(null);

    const titleField = subject
      .findAllComponents(LabelDiv)
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
    const subject = mountWithProps(flaw, { mode: 'edit' });
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
    vm.flaw.cve_description = 'I am once more a spooky CVE';
    vm.flaw.major_incident_state = 'APPROVED';
    expect(vm.errors.cve_description).toBe(null);
  });

  osimFullFlawTest('displays correct Owner field value from props', async ({ flaw }) => {
    flaw.owner = 'test owner';
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const assigneeField = subject.findComponent(FlawFormOwner);
    expect(assigneeField?.find('span.form-label').text()).toBe('Owner');
    expect(assigneeField?.props().modelValue).toBe('test owner');
    expect(assigneeField?.html()).toContain('test owner');
  });

  osimFullFlawTest('displays correct State field value from props', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const workflowStateField = subject.findComponent(FlawWorkflowState);
    expect(workflowStateField?.findComponent(LabelDiv).props().label).toBe('State');
    expect(workflowStateField?.props().classification.state).toBe('NEW');
  });

  osimFullFlawTest('displays with impact nudge when workflow state is after triage', async ({ flaw }) => {
    flaw.classification!.state = FlawClassificationStateEnum.PreSecondaryAssessment;
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const workflowStateField = subject.findComponent(FlawWorkflowState);
    expect(workflowStateField?.props().classification.state).toBe('PRE_SECONDARY_ASSESSMENT');
    (subject.vm as any).flaw.impact = 'CRITICAL';
    await flushPromises();
    expect(subject.findComponent(Nudge)).toBeTruthy();
  });

  osimFullFlawTest('displays promote and reject buttons for state', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const menu = subject
      .findComponent(FlawWorkflowState)
      .findComponent(DropDownMenu);

    const menuButton = menu.find('button[type="button"]');
    await menuButton.trigger('click');
    await nextTick();

    for (const button of menu.findAll('button')) {
      expect(([
        'Change State',
        'Promote to Triage',
        'Reject',
        'Reset',
        'Revert to Empty',
      ]).includes(button.text().trim())).toBe(true);
    }
  });

  osimFullFlawTest('shows a modal for reject button clicks', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const menu = subject
      .findComponent(FlawWorkflowState)
      .findComponent(DropDownMenu);

    const menuButton = menu.find('button[type="button"]');
    await menuButton.trigger('click');
    await nextTick();

    const rejectButton = menu?.findAll('button')?.find(el => el.text() === 'Reject');
    await rejectButton?.trigger('click');
    await flushPromises();
    expect(subject.find('.modal-dialog').exists()).toBe(true);
  });

  osimFullFlawTest('shows an explanation message when nvd score and Rh score mismatch', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const cvssScoreError = subject.find('.cvss-score-mismatch');
    expect(cvssScoreError?.exists()).toBe(true);
    expect(cvssScoreError?.text()).toBe('Explain non-obvious CVSSv3 score metrics');
  });

  osimFullFlawTest('shows a highlighted nvdCvssField value when nvd score and Rh score mismatch', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
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
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('An embargoed flaw must have a public date in the future.');
  });

  osimFullFlawTest('if embargoed and public date is later today (in the future) it returns null', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T23:00:00Z';
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('if embargoed and public date is in the future, it returns null', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T23:00:00Z';
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('if NOT embargoed and public date is in the future, it returns an error ', async ({ flaw }) => {
    flaw.embargoed = false;
    flaw.unembargo_dt = '3000-01-01';
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('A public flaw cannot have a public date in the future.');
  });

  osimFullFlawTest('if NOT embargoed and public date is today or in the past, it returns null', async ({ flaw }) => {
    flaw.embargoed = false;
    flaw.unembargo_dt = DateTime.now().toISODate() + 'T00:00:00Z';
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('if NOT embargoed and public date is null, it returns an error message', async ({ flaw }) => {
    flaw.embargoed = false;
    flaw.unembargo_dt = null;
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe('A public flaw must have a public date set.');
  });

  osimFullFlawTest('if embargoed and public date is null, it returns null', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = null;
    const subject = mountWithProps(flaw, { mode: 'edit' });
    expect((subject.vm as any).errors.unembargo_dt)
      .toBe(null);
  });

  osimFullFlawTest('sets public date if empty when unembargo button is clicked', async ({ flaw }) => {
    flaw.embargoed = true;
    flaw.unembargo_dt = null;
    const subject = mountWithProps(flaw, { mode: 'edit' });
    await flushPromises();
    subject.findComponent(IssueFieldEmbargo).find('.osim-unembargo-button').trigger('click');

    expect(flaw.unembargo_dt).not.toBe(null);
  });

  osimFullFlawTest('should show only allowed sources in edit mode', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    const options = sourceField?.findAll('option');
    expect(options?.length).toBe(flawSources.length);
    const disabledOptions = sourceField?.findAll('option[hidden]');
    expect(disabledOptions?.length).not.toBe(0);
  });

  osimFullFlawTest('should show all sources in create mode', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'create' });
    const sourceField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'CVE Source');
    const options = sourceField?.findAll('option');
    expect(options?.length).toBe(flawSources.length);
    const disabledOptions = sourceField?.findAll('option[hidden]');
    expect(disabledOptions?.length).not.toBe(0);
  });

  osimFullFlawTest('should show a link to bugzilla if ID exists', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });

    const bugzillaLink = subject.find('.osim-flaw-header-link > a');
    expect(bugzillaLink.exists()).toBe(true);
  });

  osimFullFlawTest('should not show a link to bugzilla if ID does not exists', async ({ flaw }) => {
    flaw.meta_attr = {};
    const subject = mountWithProps(flaw, { mode: 'edit' });

    const bugzillaLink = subject.find('.osim-flaw-header-link > a');
    expect(bugzillaLink.exists()).toBe(false);
  });

  osimFullFlawTest('should show a link to Jira if task_key exists', async ({ flaw }) => {
    flaw.task_key = 'OSIM-1234';

    const subject = mountWithProps(flaw, { mode: 'edit' });

    const flawLinks = subject.findAll('.osim-flaw-header-link > a');
    expect(flawLinks.length).toBe(2);
    expect(flawLinks[1].text()).contain('Jira');
  });

  osimFullFlawTest('should not show a link to Jira if task_key does not exists', async ({ flaw }) => {
    flaw.task_key = '';

    const subject = mountWithProps(flaw, { mode: 'edit' });

    const flawLinks = subject.findAll('.osim-flaw-header-link > a');
    expect(flawLinks.length).toBe(1);
    expect(flawLinks[0].text()).not.toContain('Jira');
  });

  osimFullFlawTest('should show CreatedDate on Flaw Edit', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const createdAtField = subject
      .findAllComponents(LabelStatic)
      .find(component => component.props().label === 'Created Date');
    expect(createdAtField?.exists()).toBeTruthy();
    const formEL = createdAtField?.find('span.form-control');
    expect(formEL?.exists()).toBeTruthy();
    expect(formEL?.text()).toBe('2021-09-13 09:09 UTC');
  });

  osimFullFlawTest('should not show CreatedDate on Flaw Creation', async ({ flaw }) => {
    const subject = mountWithProps(flaw, { mode: 'create' });
    const createdAtField = subject
      .findAllComponents(LabelStatic)
      .find(component => component.props().label === 'Created Date');
    expect(createdAtField?.exists()).toBeFalsy();
  });

  osimFullFlawTest('should show border when flaw is embargoed', async ({ flaw }) => {
    flaw.embargoed = true;
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const flawForm = subject.find('div.osim-flaw-form-embargoed');

    expect(flawForm?.exists()).toBeTruthy();
  });

  osimFullFlawTest('should not show border when flaw is not embargoed', async ({ flaw }) => {
    flaw.embargoed = false;
    const subject = mountWithProps(flaw, { mode: 'edit' });
    const flawForm = subject.find('div.osim-flaw-form-embargoed');

    expect(flawForm?.exists()).toBeFalsy();
  });

  osimFullFlawTest('should hide blank option in incident state when value is set', async ({ flaw }) => {
    flaw.major_incident_state = 'MAJOR_INCIDENT_REQUESTED';
    const subject = mountWithProps(flaw, { mode: 'edit' });

    const incidentStateField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Incident State');

    expect(incidentStateField?.exists()).toBe(true);
    expect(incidentStateField?.props().optionsHidden).toEqual(['']);
  });

  osimFullFlawTest('should disable incident state dropdown when no value is set', async ({ flaw }) => {
    flaw.major_incident_state = null;
    const subject = mountWithProps(flaw, { mode: 'edit' });

    const incidentStateField = subject
      .findAllComponents(LabelSelect)
      .find(component => component.props().label === 'Incident State');

    expect(incidentStateField?.exists()).toBe(true);
    const selectElement = incidentStateField?.find('select');
    expect(selectElement?.attributes('disabled')).toBeDefined();
  });

  osimFullFlawTest('should trigger validation error for duplicate affects without purl', async ({ flaw }) => {
    flaw.affects = [
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component1',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component1', // Same component
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
    ];

    const subject = mountWithProps(flaw, { mode: 'edit' });
    const vm = subject.findComponent(FlawForm).vm as any;

    expect(vm.errors.affects[1].ps_component).toBe(
      'Affected component cannot be registered on the affected component/PURL twice',
    );
  });

  osimFullFlawTest('should trigger validation error for duplicate affects with same purl', async ({ flaw }) => {
    flaw.affects = [
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component1',
        purl: 'pkg:npm/package@1.0.0',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'different_component', // Different component but same normalized purl
        purl: 'pkg:npm/package@1.0.0',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
    ];

    const subject = mountWithProps(flaw, { mode: 'edit' });
    const vm = subject.findComponent(FlawForm).vm as any;

    expect(vm.errors.affects[1].ps_component).toBe(
      'Affected component cannot be registered on the affected component/PURL twice',
    );
  });

  osimFullFlawTest('should trigger validation error for purls with same qualifiers in different order',
    async ({ flaw }) => {
      flaw.affects = [
        {
          ps_update_stream: 'stream1',
          ps_module: 'module1',
          ps_component: 'component1',
          purl: 'pkg:npm/package@1.0.0?qualifier1=value1&qualifier2=value2',
          embargoed: false,
          cvss_scores: [],
          alerts: [],
          labels: [],
          tracker: null,
          subpackage_purls: [],
        },
        {
          ps_update_stream: 'stream1',
          ps_module: 'module1',
          ps_component: 'component2',
          purl: 'pkg:npm/package@1.0.0?qualifier2=value2&qualifier1=value1', // Same qualifiers but different order
          embargoed: false,
          cvss_scores: [],
          alerts: [],
          labels: [],
          tracker: null,
          subpackage_purls: [],
        },
      ];

      const subject = mountWithProps(flaw, { mode: 'edit' });
      const vm = subject.findComponent(FlawForm).vm as any;

      expect(vm.errors.affects[1].ps_component).toBe(
        'Affected component cannot be registered on the affected component/PURL twice',
      );
    });

  osimFullFlawTest('should not trigger validation error for purls with different qualifiers', async ({ flaw }) => {
    flaw.affects = [
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component1',
        purl: 'pkg:npm/package@1.0.0?qualifier1=value1',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component2',
        purl: 'pkg:npm/package@1.0.0?qualifier2=value2', // Different qualifier
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
    ];

    const subject = mountWithProps(flaw, { mode: 'edit' });
    const vm = subject.findComponent(FlawForm).vm as any;

    expect(vm.errors.affects[1].ps_component).toBe(null);
  });

  osimFullFlawTest('should not trigger validation error for different affects', async ({ flaw }) => {
    flaw.affects = [
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component1',
        purl: '',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
      {
        ps_update_stream: 'stream2', // Different stream
        ps_module: 'module1',
        ps_component: 'component1',
        purl: '',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component1',
        purl: 'pkg:npm/package1@1.0.0', // Different purl
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
      {
        ps_update_stream: 'stream1',
        ps_module: 'module1',
        ps_component: 'component2', // Different component, no purl
        purl: '',
        embargoed: false,
        cvss_scores: [],
        alerts: [],
        labels: [],
        tracker: null,
        subpackage_purls: [],
      },
    ];

    const subject = mountWithProps(flaw, { mode: 'edit' });
    const vm = subject.findComponent(FlawForm).vm as any;

    for (let i = 0; i < flaw.affects.length; i++) {
      expect(vm.errors.affects[i].ps_component).toBe(null);
    }
  });
});
