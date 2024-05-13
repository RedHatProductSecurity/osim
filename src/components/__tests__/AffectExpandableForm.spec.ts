import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';

import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import {
  affectResolutions,
  affectAffectedness,
} from '@/types/zodFlaw';


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
      'impact':''
      ,'cvss2':'',
      'cvss2_score':null,
      'cvss3':'',
      'cvss3_score':null,
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
    'impact':'','cvss2':'',
    'cvss2_score':null,
    'cvss3':'',
    'cvss3_score':null,
    'trackers':[],
    'delegated_resolution':null,
    'cvss_scores':[],
    'embargoed':false,
    'alerts':{},
    'created_dt':'2021-07-30T14:46:50Z',
    'updated_dt':'2024-03-18T08:01:09Z', 
  };

  beforeAll(() =>{
    const props: typeof AffectExpandableForm.props = {
      error: {},
      isExpanded: true,
      componentName :'test',
      modelValue: MockData,
      affectedComponent: MockData,
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

  it('should render buttons', () => {
    const button = subject.find('button.btn.btn-white.btn-outline-black.btn-sm.ms-2');
    expect(button.exists()).toBeTruthy();
    expect(button.text()).toBe('File Tracker');
  });

  it('should render affectedness, resolution select', () => {
    const formComponent = subject.findAllComponents(AffectedOfferingForm);
    expect(formComponent.length).toBe(1);
    const selectComponents = formComponent[0].findAllComponents(LabelSelect);
    expect(selectComponents.length).toBe(4);
    const affectednessSelectEl = selectComponents[1];
    const resolutionSelectEL = selectComponents[2];
    const affectednessOptions = affectednessSelectEl.props('options');
    expect(affectednessOptions).toStrictEqual(affectAffectedness);
    const resolutionOptions = resolutionSelectEL.props('options');
    expect(resolutionOptions).toStrictEqual(affectResolutions);
    const resolutoinHiddenOptions = resolutionSelectEL.findAll('option[hidden]');
    expect(resolutoinHiddenOptions.length).toBe(3);
  });
});
