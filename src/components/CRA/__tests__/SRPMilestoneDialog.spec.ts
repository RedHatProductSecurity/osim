import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import SRPMilestoneDialog from '@/components/CRA/SRPMilestoneDialog.vue';
import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({
    userEmail: 'skynet@redhat.com',
  }),
}));

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

    // Fill required fields for new milestone
    await wrapper.find('input[type="date"]').setValue('2026-08-21');
    await wrapper.findAll('input[type="text"]').at(0)?.setValue('ENISA Portal');
    await wrapper.find('textarea').setValue('Request for additional information');

    await wrapper.find('.modal-footer').find('.btn-primary').trigger('click');
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('self assigns owner from current user email', async () => {
    const milestone = {
      ...mockSRPReport.milestones[0],
      owner: '',
    };
    const wrapper = mount(SRPMilestoneDialog, {
      props: {
        milestone,
        show: true,
      },
    });

    await wrapper.find('button.osim-self-assign').trigger('click');
    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe('skynet@redhat.com');

    await wrapper.find('.modal-footer').find('.btn-primary').trigger('click');
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      owner: 'skynet@redhat.com',
      updated_dt: milestone.updated_dt,
    });
  });

  it('does not save invalid owner email', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = mount(SRPMilestoneDialog, {
      props: {
        milestone: mockSRPReport.milestones[0],
        show: true,
      },
    });

    await wrapper.find('input[type="email"]').setValue('not-an-email');
    await wrapper.find('.modal-footer').find('.btn-primary').trigger('click');

    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.emitted('close')).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('Owner must be a valid email address.');
  });
});
