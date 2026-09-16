import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRPReportDialog from '@/components/CRA/SRPReportDialog.vue';

describe('sRPReportDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });
    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: false },
    });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('emits save and close events when save button clicked', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    // Fill required title field
    await wrapper.find('input[type="text"]').setValue('Sample SRP Report Title');

    // Fill required evidence field
    await wrapper.find('textarea').setValue('Sample evidence for the report');

    // Find the Save button in the footer (not the "Set Today" button)
    const footer = wrapper.find('.modal-footer');
    await footer.findAll('.btn-primary').at(0)?.trigger('click');

    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('sets timer to current date when "Set Today" button is clicked', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    const timerInput = wrapper.find<HTMLInputElement>('input[type="datetime-local"]');
    expect(timerInput.element.value).toBe('');

    // Click "Set Today" button
    const setTodayButton = wrapper.findAll('.btn-primary').at(0);
    await setTodayButton?.trigger('click');

    // Check that the input now has a value (current date/time)
    const value = timerInput.element.value;
    expect(value).toBeTruthy();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('fills all EU member states when "Select All" button is clicked', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    // Find the "Select All" button in the EUStatesSelector component
    const selectAllButton = wrapper.findAll('button')
      .find(btn => btn.text().includes('Select All'));
    expect(selectAllButton).toBeDefined();

    // Click "Select All" button
    await selectAllButton?.trigger('click');

    // Check that the form emits correct data when saved
    await wrapper.find('input[type="text"]').setValue('Sample SRP Report Title');
    await wrapper.find('textarea').setValue('Sample evidence');
    const footer = wrapper.find('.modal-footer');
    await footer.findAll('.btn-primary').at(0)?.trigger('click');

    const savedData = wrapper.emitted('save')?.[0]?.[0] as any;
    expect(savedData.member_states_available).toBeDefined();
    expect(savedData.member_states_available.length).toBe(27);
    expect(savedData.member_states_available).toContain('ES');
    expect(savedData.member_states_available).toContain('EL');
  });
});
