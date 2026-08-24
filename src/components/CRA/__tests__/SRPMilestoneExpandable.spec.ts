import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, expect, it, vi } from 'vitest';

import SRPMilestoneExpandable from '@/components/CRA/SRPMilestoneExpandable.vue';
import type { SRPReportMilestone } from '@/types/cra';
import * as SRPService from '@/services/SRPService';

vi.mock('@/services/SRPService', () => ({
  updateSRPMilestone: vi.fn(() => Promise.resolve({})),
}));

const mockMilestone: SRPReportMilestone = {
  acl_read: [],
  acl_write: [],
  created_dt: '2026-08-20T10:00:00Z',
  days_remaining: 5,
  due_at: '2026-08-25T10:00:00Z',
  hours_remaining: 120,
  is_overdue: false,
  manual_completion_notes: 'Test notes',
  milestone_type: 'additional_information_response',
  missing_required_fields: '',
  owner: 'test@example.com',
  request_received_at: '2026-08-20T10:00:00Z',
  request_source: 'ENISA Portal',
  request_text: 'Request for additional information',
  srp_report: 'report-uuid-123',
  status: 'prepared',
  updated_dt: '2026-08-20T10:00:00Z',
  uuid: 'milestone-uuid-123',
};

describe('sRPMilestoneExpandable', () => {
  const mountOptions = {
    global: {
      plugins: [createTestingPinia()],
    },
  };

  it('renders milestone row', () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    expect(wrapper.text()).toContain('additional_information_response');
    expect(wrapper.text()).toContain('5d');
  });

  it('expands milestone when clicked', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    expect(wrapper.find('.milestone-details-expanded').exists()).toBe(false);

    await wrapper.find('.milestone-row').trigger('click');

    expect(wrapper.find('.milestone-details-expanded').exists()).toBe(true);
    expect(wrapper.text()).toContain('milestone-uuid-123');
    expect(wrapper.text()).toContain('test@example.com');
  });

  it('shows overdue status', () => {
    const overdueMilestone = { ...mockMilestone, is_overdue: true, days_remaining: -2 };
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: overdueMilestone },
    });

    expect(wrapper.text()).toContain('Overdue');
    expect(wrapper.find('.table-danger').exists()).toBe(true);
  });

  it('shows dash when days_remaining is null', () => {
    const milestone = { ...mockMilestone, days_remaining: null, hours_remaining: null };
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone },
    });

    expect(wrapper.text()).toContain('-');
  });

  it('emits edit-milestone event', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.btn-dark').trigger('click');

    expect(wrapper.emitted('edit-milestone')).toBeTruthy();
    expect(wrapper.emitted('edit-milestone')?.[0]).toEqual([mockMilestone]);
  });

  it('handles quick action submit', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.btn-success').trigger('click');

    expect(SRPService.updateSRPMilestone).toHaveBeenCalledWith(
      'report-uuid-123',
      'milestone-uuid-123',
      expect.objectContaining({ status: 'submitted' }),
    );
    expect(wrapper.emitted('refresh')).toBeTruthy();
  });

  it('handles quick action defer', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.btn-warning').trigger('click');

    expect(SRPService.updateSRPMilestone).toHaveBeenCalledWith(
      'report-uuid-123',
      'milestone-uuid-123',
      expect.objectContaining({ status: 'deferred' }),
    );
  });

  it('handles quick action block', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.btn-danger').trigger('click');

    expect(SRPService.updateSRPMilestone).toHaveBeenCalledWith(
      'report-uuid-123',
      'milestone-uuid-123',
      expect.objectContaining({ status: 'blocked' }),
    );
  });

  it('handles quick action errors', async () => {
    vi.mocked(SRPService.updateSRPMilestone).mockRejectedValueOnce(new Error('Update failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.btn-success').trigger('click');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(console.error).toHaveBeenCalledWith(
      'Failed to update SRP milestone status:',
      expect.any(Error),
    );
  });

  it('displays request details when expanded', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.milestone-row').trigger('click');

    expect(wrapper.text()).toContain('Request Source:');
    expect(wrapper.text()).toContain('ENISA Portal');
    expect(wrapper.text()).toContain('Request Text:');
    expect(wrapper.text()).toContain('Request for additional information');
  });

  it('displays missing required fields warning', async () => {
    const milestone = { ...mockMilestone, missing_required_fields: 'field1, field2' };
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone },
    });

    await wrapper.find('.milestone-row').trigger('click');

    expect(wrapper.text()).toContain('Missing Fields:');
    expect(wrapper.text()).toContain('field1, field2');
  });

  it('parses and displays details_json', async () => {
    const milestoneWithDetails = {
      ...mockMilestone,
      details_json: { key1: 'value1', key2: { nested: 'value' } },
    } as any;

    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: milestoneWithDetails },
    });

    await wrapper.find('.milestone-row').trigger('click');

    expect(wrapper.text()).toContain('key1:');
    expect(wrapper.text()).toContain('value1');
    expect(wrapper.text()).toContain('key2:');
  });

  it('handles string details_json', async () => {
    const milestoneWithDetails = {
      ...mockMilestone,
      details_json: '{"key":"value"}',
    } as any;

    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: milestoneWithDetails },
    });

    await wrapper.find('.milestone-row').trigger('click');

    expect(wrapper.text()).toContain('key:');
    expect(wrapper.text()).toContain('value');
  });

  it('shows no details message when details_json is absent', async () => {
    const wrapper = mount(SRPMilestoneExpandable, {
      ...mountOptions,
      props: { milestone: mockMilestone },
    });

    await wrapper.find('.milestone-row').trigger('click');

    expect(wrapper.text()).toContain('No additional details available');
  });
});
