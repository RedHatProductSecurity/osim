import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRPReportDialog from '@/components/CRA/SRPReportDialog.vue';

describe('sRPReportDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('Add SRP Reportable Event');
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

    // Find the Save button in the footer (not the Select All button)
    const footer = wrapper.find('.modal-footer');
    await footer.findAll('.btn-primary').at(0)?.trigger('click');

    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('only offers AEV and severe incident event types', () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    const eventTypeOptions = wrapper.findAll('select').at(0)?.findAll('option').map(option => option.text());

    expect(eventTypeOptions).toEqual(['Actively Exploited Vulnerability', 'Severe Incident']);
    expect(wrapper.text()).not.toContain('Additional Information Request');
  });

  it('selects all EU member states and emits them as an array', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    await wrapper.find('input[type="text"]').setValue('Sample SRP Report Title');
    await wrapper.find('textarea').setValue('Sample evidence for the report');
    await wrapper.findAll('button').find(button => button.text().includes('Select All'))?.trigger('click');
    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(false);
    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      member_states_available: expect.arrayContaining(['AT', 'DE', 'EL']),
    });
    expect((wrapper.emitted('save')?.[0][0] as any).member_states_available).toHaveLength(27);
  });

  it('fills all EU member states when "Select All" button is clicked', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    // Find the member states input field
    const memberStatesInput = wrapper.findAll('input[type="text"]')
      .find(input => input.element.placeholder.includes('ES, FR'));
    expect(memberStatesInput).toBeDefined();
    expect(memberStatesInput?.element.value).toBe('');

    // Click "Select All" button
    const selectAllButton = wrapper.findAll('.btn-secondary')
      .find(btn => btn.text().includes('Select All'));
    await selectAllButton?.trigger('click');

    // Check that all EU states are now in the input
    const value = memberStatesInput?.element.value;
    expect(value).toBeTruthy();
    expect(value).toContain('ES');
    expect(value).toContain('FR');
    expect(value).toContain('DE');
    expect(value).toContain('EL'); // Greece
    // Check that it has 27 codes (27 EU member states)
    const codes = value?.split(',').map(s => s.trim());
    expect(codes?.length).toBe(27);
  });
});
