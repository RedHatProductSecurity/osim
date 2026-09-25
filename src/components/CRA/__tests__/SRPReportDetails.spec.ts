import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

import SRPReportDetails from '../SRPReportDetails.vue';

vi.mock('@/services/SRPService', () => ({
  updateSRPMilestone: vi.fn(() => Promise.resolve({})),
}));

describe('sRPReportDetails', () => {
  it('renders milestone table', () => {
    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    expect(wrapper.text()).toContain('SRP Reports');
    expect(wrapper.text()).toContain('24h');
    expect(wrapper.text()).toContain('Owner');
    expect(wrapper.text()).toContain('Created');
    expect(wrapper.text()).toContain('Submitted');
  });

  it('renders created date or N/A in milestone rows', () => {
    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    // Should display formatted created_dt (2026-01-01T00:00:00Z as "2026-01-01 00:00 UTC")
    expect(wrapper.text()).toContain('2026-01-01 00:00');
  });

  it('emits add-milestone event', async () => {
    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('add-milestone')).toBeTruthy();
  });

  it('emits view-payload event for payload milestones', async () => {
    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    const editButton = wrapper.findAll('button').find(btn => btn.html().includes('bi-pencil-square'));
    await editButton?.trigger('click');
    expect(wrapper.emitted('view-payload')).toBeTruthy();
  });

  it('handles quick action errors', async () => {
    const { updateSRPMilestone } = await import('@/services/SRPService');
    vi.mocked(updateSRPMilestone).mockRejectedValue(new Error('Network error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    const submitButton = wrapper.findAll('button').find(btn => btn.html().includes('bi-check-circle'));
    await submitButton?.trigger('click');

    expect(console.error).toHaveBeenCalledWith('Failed to update SRP milestone status:', expect.any(Error));
  });
});
