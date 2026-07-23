import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRPMilestoneDialog from '@/components/CRA/SRPMilestoneDialog.vue';

describe('sRPMilestoneDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: true },
    });
    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: false },
    });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('emits save and close events when save button clicked', async () => {
    const wrapper = mount(SRPMilestoneDialog, {
      props: { show: true },
    });
    await wrapper.findAll('.btn-primary').at(0)?.trigger('click');
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
