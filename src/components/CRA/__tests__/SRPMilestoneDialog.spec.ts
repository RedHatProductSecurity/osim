import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it } from 'vitest';

import SRPMilestoneDialog from '@/components/CRA/SRPMilestoneDialog.vue';

describe('sRPMilestoneDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: true },
      global: {
        plugins: [createTestingPinia()],
      },
    });
    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: false },
      global: {
        plugins: [createTestingPinia()],
      },
    });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('emits save and close events when save button clicked', async () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: true },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    // Fill required fields for new milestone
    await wrapper.find('input[type="date"]').setValue('2026-08-21');
    await wrapper.findAll('input[type="text"]').at(0)?.setValue('ENISA Portal');
    await wrapper.find('textarea').setValue('Request for additional information');

    // Find the Save button in the footer (not the Self Assign button)
    const footer = wrapper.find('.modal-footer');
    await footer.findAll('.btn-primary').at(0)?.trigger('click');

    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
