import {describe, it, expect} from 'vitest';

import CveRequestForm from '../CveRequestForm.vue';

import {useToastStore} from '../../stores/ToastStore';
import {useUserStore} from '../../stores/UserStore';
import {mount} from './test-helpers';


describe('CveRequestForm', () => {
  it('renders a form', () => {
    const wrapper = mount(CveRequestForm, {
      props: {
        subject: 'string',
        description: 'string',
        osimLink: 'string',
        bugzillaLink: 'string',
      },
    });
    let s = wrapper.text();
    expect(s).toContain('Request CVE');
  });
  it('renders a button', () => {
    const wrapper = mount(CveRequestForm, {
      props: {
        subject: 'string',
        description: 'string',
        osimLink: 'string',
        bugzillaLink: 'string',
      },
    });
    let button = wrapper.get('button');
    expect(button.text()).toBe('Request CVE');
  });
  it('does not render before clicking the button', () => {
    const wrapper = mount(CveRequestForm, {
      props: {
        subject: 'string',
        description: 'string',
        osimLink: 'string',
        bugzillaLink: 'string',
      },
    });
    let button = wrapper.get('button');
    expect(wrapper.find('div.modal-content').exists()).toBe(false);
  });
  it('renders a modal when clicking the button', () => {
    const wrapper = mount(CveRequestForm, {
      props: {
        subject: 'string',
        description: 'string',
        osimLink: 'string',
        bugzillaLink: 'string',
      },
    });
    let button = wrapper.get('button');
    console.log(button);
    button.trigger('click');
    let currentComponent = wrapper.getCurrentComponent();
    expect(wrapper.find('div.modal-content').exists()).toBe(true);
  });
});
