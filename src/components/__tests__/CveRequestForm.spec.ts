import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import CveRequestForm from '../CveRequestForm.vue';

createTestingPinia();

describe('cveRequestForm', () => {
  it('renders a form', () => {
    const wrapper = mount(CveRequestForm, {
      props: {
        subject: 'string',
        description: 'string',
        osimLink: 'string',
        bugzillaLink: 'string',
      },
    });
    const s = wrapper.text();
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
    const button = wrapper.get('button');
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
    // const button = wrapper.get('button');
    expect(wrapper.find('div.modal-content').exists()).toBe(false);
  });
  it('renders a modal when clicking the button', async () => {
    const wrapper = mount(CveRequestForm, {
      props: {
        subject: 'string',
        description: 'string',
        osimLink: 'string',
        bugzillaLink: 'string',
      },
    });
    const button = wrapper.get('button');
    await button.trigger('click');
    expect(wrapper.find('div.modal-content').exists()).toBe(true);
  });
});
