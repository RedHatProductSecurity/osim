import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

import type { SRPReport } from '@/types/cra';

import SRPReportDetails from '../SRPReportDetails.vue';

const mockReportWithNotes: SRPReport = {
  ...mockSRPReport,
  milestones: [{
    ...mockSRPReport.milestones[0],
    manual_completion_notes: 'Coordinator note about submission',
    request_source: 'ENISA Portal',
    request_text: 'Please provide additional CVE details',
  }],
};

vi.mock('@/services/SRPService', () => ({
  updateSRPMilestone: vi.fn(() => Promise.resolve({})),
}));

describe('sRPReportDetails', () => {
  let updateSRPMilestone: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    ({ updateSRPMilestone } = await import('@/services/SRPService') as any);
    vi.mocked(updateSRPMilestone).mockReset();
    vi.mocked(updateSRPMilestone).mockResolvedValue({});
  });

  it('renders milestone table', () => {
    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    expect(wrapper.text()).toContain('Milestones');
    expect(wrapper.text()).toContain('24h');
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

  it('emits edit-milestone event', async () => {
    const wrapper = mount(SRPReportDetails, {
      props: {
        report: mockSRPReport,
      },
    });

    const editButton = wrapper.findAll('button').find(btn => btn.html().includes('bi-pencil'));
    await editButton?.trigger('click');
    expect(wrapper.emitted('edit-milestone')).toBeTruthy();
  });

  it('hides milestone detail row by default', () => {
    const wrapper = mount(SRPReportDetails, { props: { report: mockReportWithNotes } });
    expect(wrapper.find('.milestone-detail').exists()).toBe(false);
  });

  it('shows milestone detail with notes when expand button is clicked', async () => {
    const wrapper = mount(SRPReportDetails, { props: { report: mockReportWithNotes } });
    await wrapper.find('.expand-btn').trigger('click');
    expect(wrapper.find('.milestone-detail').exists()).toBe(true);
    expect(wrapper.text()).toContain('Coordinator note about submission');
    expect(wrapper.text()).toContain('ENISA Portal');
    expect(wrapper.text()).toContain('Please provide additional CVE details');
  });

  it('collapses milestone detail when expand button is clicked again', async () => {
    const wrapper = mount(SRPReportDetails, { props: { report: mockReportWithNotes } });
    await wrapper.find('.expand-btn').trigger('click');
    expect(wrapper.find('.milestone-detail').exists()).toBe(true);
    await wrapper.find('.expand-btn').trigger('click');
    expect(wrapper.find('.milestone-detail').exists()).toBe(false);
  });

  it('activates submit button via keyboard', async () => {
    const wrapper = mount(SRPReportDetails, { props: { report: mockSRPReport } });
    const submitButton = wrapper.findAll('button').find(btn => btn.html().includes('bi-check-circle'));
    await submitButton?.trigger('keydown', { key: 'Enter' });
    expect(updateSRPMilestone).toHaveBeenCalled();
    vi.mocked(updateSRPMilestone).mockClear();
    await submitButton?.trigger('click');
    expect(updateSRPMilestone).toHaveBeenCalled();
  });

  it('activates defer button via keyboard', async () => {
    const wrapper = mount(SRPReportDetails, { props: { report: mockSRPReport } });
    const deferButton = wrapper.findAll('button').find(btn => btn.html().includes('bi-clock'));
    await deferButton?.trigger('keydown', { key: 'Enter' });
    expect(updateSRPMilestone).toHaveBeenCalled();
    vi.mocked(updateSRPMilestone).mockClear();
    await deferButton?.trigger('click');
    expect(updateSRPMilestone).toHaveBeenCalled();
  });

  it('activates block button via keyboard', async () => {
    const wrapper = mount(SRPReportDetails, { props: { report: mockSRPReport } });
    const blockButton = wrapper.findAll('button').find(btn => btn.html().includes('bi-slash-circle'));
    await blockButton?.trigger('keydown', { key: 'Enter' });
    expect(updateSRPMilestone).toHaveBeenCalled();
    vi.mocked(updateSRPMilestone).mockClear();
    await blockButton?.trigger('click');
    expect(updateSRPMilestone).toHaveBeenCalled();
  });

  it('handles quick action errors', async () => {
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
