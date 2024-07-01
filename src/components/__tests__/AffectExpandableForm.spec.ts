import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import {
  affectResolutions,
  affectAffectedness,
} from '@/types/zodAffect';

vi.mock('@/stores/osimRuntime', async () => {
  const osimRuntimeValue = {
    env: 'unittest',
    backends: {
      osidb: 'http://osidb-backend',
      bugzilla: 'http://bugzilla-backend',
      jira: 'http://jira-backend',
      errata: 'http://errata',
      jiraDisplay: 'http://jira-backend',
    },
    osimVersion: {
      rev: 'osimrev', tag: 'osimtag', timestamp: '1970-01-01T00:00:00Z', dirty: true
    },
    error: '',
  };
  return {
    setup: vi.fn(() => { }),
    osimRuntimeStatus: 1,
    osidbHealth: {
      revision: '',
    },
    osimRuntime: {
      value: osimRuntimeValue,
      ...osimRuntimeValue,
    },
    OsimRuntimeStatus: {
      INIT: 0,
      READY: 1,
      ERROR: 2,
    },
  };
});

describe('AffectExpandableForm', () => {

  let subject: VueWrapper<InstanceType<typeof AffectExpandableForm>>;
  const MockData = {
    value: {
      'uuid':'08cbd626-5ac3-4c82-84bf-57837936a167',
      'flaw':'7e8b8f90-8916-4f59-8fe4-ac3ea684df38',
      'type':'DEFAULT',
      'affectedness':'NEW',
      'resolution':'',
      'ps_module':'rhel-6',
      'ps_product':'Red Hat Enterprise Linux',
      'ps_component':'c-ares',
      'impact':'',
      'trackers':[],
      'delegated_resolution':null,
      'cvss_scores':[],
      'embargoed':false,
      'alerts':{},
      'created_dt':'2021-07-30T14:46:50Z',
      'updated_dt':'2024-03-18T08:01:09Z',
    },
    'uuid':'08cbd626-5ac3-4c82-84bf-57837936a167',
    'flaw':'7e8b8f90-8916-4f59-8fe4-ac3ea684df38',
    'type':'DEFAULT',
    'affectedness':'NEW',
    'resolution':'DELEGATED',
    'ps_module':'rhel-6',
    'ps_product':'Red Hat Enterprise Linux',
    'ps_component':'c-ares',
    'impact':'',
    'trackers':[
      {
        'affects': [
          'test'
        ],
        'errata': [
          {
            'et_id': 'et_id',
            'advisory_name': 'advisory_name',
            'shipped_dt': null,
            'created_dt': '2024-03-07T16:56:24Z',
            'updated_dt': '2024-05-09T14:41:20Z'
          }
        ],
        'external_system_id': 'external_system_id',
        'ps_update_stream': 'ps_update_stream',
        'status': 'Release Pending',
        'resolution': '',
        'type': 'JIRA',
        'uuid': 'uuid',
        'embargoed': false,
        'alerts': [],
        'created_dt': '2024-03-12T16:09:44Z',
        'updated_dt': '2024-04-05T18:21:05Z'
      }
    ],
    'delegated_resolution':null,
    'cvss_scores':[],
    'embargoed':false,
    'alerts':{},
    'created_dt':'2021-07-30T14:46:50Z',
    'updated_dt':'2024-03-18T08:01:09Z',
  };

  beforeAll(() => {
    const props: typeof AffectExpandableForm.props = {
      error: {},
      isExpanded: true,
      modelValue: MockData,
      affect: MockData,
    };
    subject = mount(AffectExpandableForm, {
      props,
    });
  });
  afterAll(() => {});

  it('should render', () => {
    expect(subject.exists()).toBeTruthy();
  });

  it('should render component Name, affectedComponent, affectedNess, Resolution', () => {
    const label = subject.find('label.form-label');
    expect(label.exists()).toBeTruthy();
    const affectednessLabelEl = subject.find('span.affectedness-label');
    expect(affectednessLabelEl.exists()).toBeTruthy();
    expect(affectednessLabelEl.text()).toBe('Affectedness: New');
    const resolutionLabelEL = subject.find('span.resolution-label');
    expect(resolutionLabelEL.exists()).toBeTruthy();
    expect(resolutionLabelEL.text()).toBe('Resolution: Delegated');
  });

  // it('should render buttons', () => {
  //   const button = subject.find('button.btn.btn-white.btn-outline-black.btn-sm.ms-2');
  //   expect(button.exists()).toBeTruthy();
  //   expect(button.text()).toBe('File Tracker');
  // });

  it('should render affectedness, resolution select', async () => {
    const formComponent = subject.findAllComponents(AffectedOfferingForm);
    expect(formComponent.length).toBe(1);
    const selectComponents = formComponent[0].findAllComponents(LabelSelect);
    expect(selectComponents.length).toBe(3);
    const affectednessSelectEl = selectComponents[0];
    const resolutionSelectEL = selectComponents[1];
    const affectednessOptions = affectednessSelectEl.props('options');
    expect(affectednessOptions).toStrictEqual(affectAffectedness);
    await affectednessSelectEl.find('select').setValue('AFFECTED');
    const resolutionOptions = resolutionSelectEL.props('options');
    expect(resolutionOptions).toStrictEqual(affectResolutions);
    const resolutoinHiddenOptions = resolutionSelectEL.findAll('option[hidden]');
    expect(resolutoinHiddenOptions.length).toBe(3);
  });

  it('should render trackers with errata link', async () => {
    const trackerEls = subject.findAll('.osim-tracker-card');
    expect(trackerEls.length).toBe(1);
    const trakcerEL = trackerEls[0];
    await trakcerEL.find('summary.text-info')?.trigger('click');
    expect(trakcerEL.find('th.text-warning').exists()).toBeTruthy();
    const errataEl = trakcerEL.find('tr.table-warning');
    expect(errataEl.exists()).toBeTruthy();
    expect(errataEl.find('th')?.element?.textContent).toBe('Advisory');
    const linkEl = errataEl.find('td a');
    expect(linkEl.exists()).toBeTruthy();
    expect(linkEl.element?.textContent).toBe('advisory_name');
    expect(linkEl.attributes('href')).toBe('http://errata/advisory/et_id');
  });
});
