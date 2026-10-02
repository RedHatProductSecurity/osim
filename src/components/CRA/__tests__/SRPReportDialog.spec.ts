import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRPReportDialog from '@/components/CRA/SRPReportDialog.vue';

import type { SRPReport } from '@/types/cra';

const report: SRPReport = {
  created_dt: '2026-01-01T00:00:00Z',
  designated_csirt_country: '',
  designated_csirt_source: '',
  evidence: 'Existing evidence',
  flaw_id: 'flaw-uuid',
  manufacturer_or_steward_name: 'Red Hat',
  member_states_available: [],
  milestones: [],
  missing_required_fields: '',
  reportable_event_type: 'EXPLOITS_KEV_APPROVED',
  responsibility_scope: 'manufacturer',
  srp_reference_id: '',
  srp_reference_url: '',
  status: 'in_progress',
  timer_started_at: '2026-01-01T12:30:45Z',
  title: 'Existing report',
  updated_dt: '2026-01-01T00:00:00Z',
  uuid: 'report-uuid',
};

describe('sRPReportDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });
    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('Add SRP Report');
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

    const eventTypeOptions = wrapper.findAll('select')
      .at(0)?.findAll('option')
      .map(option => option.text());

    expect(eventTypeOptions).toEqual([
      'Actively Exploited Vulnerability',
      'Severe Incident',
    ]);
  });

  it('emits timer start with timezone information', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    await wrapper.find('input[type="text"]').setValue('Sample SRP Report Title');
    await wrapper.find('textarea').setValue('Sample evidence for the report');
    await wrapper.find('input[type="datetime-local"]').setValue('2026-01-01T12:30');
    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect((wrapper.emitted('save')?.[0][0] as any).timer_started_at).toMatch(/Z$/);
  });

  it('preserves existing timer start with seconds when saved unchanged', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { report, show: true },
    });

    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect((wrapper.emitted('save')?.[0][0] as any).timer_started_at).toBe('2026-01-01T12:30:45Z');
  });

  it('preserves unchanged timer start during repeated daylight-saving hour', async () => {
    const repeatedHourReport = {
      ...report,
      timer_started_at: '2026-11-01T01:30:00-05:00',
    };
    const wrapper = mount(SRPReportDialog, {
      props: { report: repeatedHourReport, show: true },
    });

    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect((wrapper.emitted('save')?.[0][0] as any).timer_started_at).toBe('2026-11-01T01:30:00-05:00');
  });

  it('selects all EU member states and emits them as an array', async () => {
    const wrapper = mount(SRPReportDialog, {
      props: { show: true },
    });

    await wrapper.find('input[type="text"]').setValue('Sample SRP Report Title');
    await wrapper.find('textarea').setValue('Sample evidence for the report');
    await wrapper.findAll('button').find(button => button.text().includes('Select All'))?.trigger('click');
    await wrapper.find('.modal-footer .btn-primary').trigger('click');

    expect(wrapper.emitted('save')?.[0][0]).toMatchObject({
      member_states_available: expect.arrayContaining(['AT', 'DE', 'EL']),
    });
    expect((wrapper.emitted('save')?.[0][0] as any).member_states_available).toHaveLength(27);
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
