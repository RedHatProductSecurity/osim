import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRPMilestoneIcons from '@/components/CRA/SRPMilestoneIcons.vue';

import type { SRPReport, SRPReportMilestone } from '@/types/cra';

const createMilestone = (overrides: Partial<SRPReportMilestone>): SRPReportMilestone => ({
  acl_read: [],
  acl_write: [],
  created_dt: '2026-08-20T10:00:00Z',
  days_remaining: 5,
  due_at: '2026-08-25T10:00:00Z',
  hours_remaining: 120,
  is_overdue: false,
  manual_completion_notes: '',
  milestone_type: '24h',
  missing_required_fields: '',
  request_received_at: null,
  request_source: '',
  request_text: '',
  srp_report: 'report-uuid',
  status: 'prepared',
  updated_dt: '2026-08-20T10:00:00Z',
  uuid: 'milestone-uuid',
  ...overrides,
});

const createReport = (milestones: SRPReportMilestone[]): SRPReport => ({
  created_dt: '2026-08-20T10:00:00Z',
  designated_csirt_country: '',
  designated_csirt_source: '',
  evidence: '',
  flaw_id: 'flaw-123',
  manufacturer_or_steward_name: '',
  member_states_available: [],
  milestones,
  missing_required_fields: '',
  reportable_event_type: 'MAJOR_INCIDENT_APPROVED',
  responsibility_scope: 'manufacturer',
  srp_reference_id: '',
  srp_reference_url: '',
  status: 'required',
  timer_started_at: null,
  title: 'Test Report',
  updated_dt: '2026-08-20T10:00:00Z',
  uuid: 'report-uuid',
});

describe('sRPMilestoneIcons', () => {
  it('renders icons for each milestone', () => {
    const report = createReport([
      createMilestone({ milestone_type: '24h', status: 'submitted' }),
      createMilestone({ milestone_type: '72h', status: 'prepared' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.findAll('i.bi').length).toBe(2);
  });

  it('shows circle-fill with success color for submitted status', () => {
    const report = createReport([
      createMilestone({ status: 'submitted' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle-fill.text-success').exists()).toBe(true);
  });

  it('shows circle-fill with warning color for prepared status', () => {
    const report = createReport([
      createMilestone({ status: 'prepared' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle-fill.text-warning').exists()).toBe(true);
  });

  it('shows circle with muted color for not_required status', () => {
    const report = createReport([
      createMilestone({ status: 'not_required' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle.text-muted').exists()).toBe(true);
  });

  it('shows circle-fill with danger color for blocked status', () => {
    const report = createReport([
      createMilestone({ status: 'blocked' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle-fill.text-danger').exists()).toBe(true);
  });

  it('shows circle-fill with secondary color for deferred status', () => {
    const report = createReport([
      createMilestone({ status: 'deferred' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle-fill.text-secondary').exists()).toBe(true);
  });

  it('shows circle-fill with danger color for failed status', () => {
    const report = createReport([
      createMilestone({ status: 'failed' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle-fill.text-danger').exists()).toBe(true);
  });

  it('shows circle-fill with danger color for required status', () => {
    const report = createReport([
      createMilestone({ status: 'required' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-circle-fill.text-danger').exists()).toBe(true);
  });

  it('shows info-circle-fill for additional_information_response', () => {
    const report = createReport([
      createMilestone({ milestone_type: 'additional_information_response', status: 'prepared' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.find('.bi-info-circle-fill').exists()).toBe(true);
  });

  it('includes milestone type in tooltip', () => {
    const report = createReport([
      createMilestone({ milestone_type: '24h', status: 'submitted' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    const icon = wrapper.find('i.bi');
    expect(icon.attributes('title')).toContain('24h');
  });

  it('includes status in tooltip with capitalization', () => {
    const report = createReport([
      createMilestone({ milestone_type: '24h', status: 'prepared' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    const icon = wrapper.find('i.bi');
    expect(icon.attributes('title')).toContain('Prepared');
  });

  it('formats milestone type with spaces and capitals in tooltip', () => {
    const report = createReport([
      createMilestone({ milestone_type: 'additional_information_response', status: 'prepared' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    const icon = wrapper.find('i.bi');
    expect(icon.attributes('title')).toContain('Additional Information Response');
  });

  it('handles multiple milestones in order', () => {
    const report = createReport([
      createMilestone({ milestone_type: '24h', status: 'submitted', uuid: 'm1' }),
      createMilestone({ milestone_type: '72h', status: 'prepared', uuid: 'm2' }),
      createMilestone({ milestone_type: 'final', status: 'not_required', uuid: 'm3' }),
    ]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    const icons = wrapper.findAll('i.bi');
    expect(icons.length).toBe(3);
    expect(icons[0].classes()).toContain('bi-circle-fill');
    expect(icons[0].classes()).toContain('text-success');
    expect(icons[1].classes()).toContain('bi-circle-fill');
    expect(icons[1].classes()).toContain('text-warning');
    expect(icons[2].classes()).toContain('bi-circle');
    expect(icons[2].classes()).toContain('text-muted');
  });

  it('handles report with no milestones', () => {
    const report = createReport([]);

    const wrapper = mount(SRPMilestoneIcons, {
      props: { report },
    });

    expect(wrapper.findAll('i.bi').length).toBe(0);
  });
});
