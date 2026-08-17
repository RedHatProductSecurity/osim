import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import SRPSummary from '@/components/CRA/SRPSummary.vue';
import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

import * as SRPService from '@/services/SRPService';

vi.mock('@/services/SRPService', () => ({
  createAdditionalInfoMilestone: vi.fn(() => Promise.resolve({})),
  fetchSRPReports: vi.fn(),
  updateSRPMilestone: vi.fn(() => Promise.resolve({})),
  updateSRPReport: vi.fn(() => Promise.resolve({})),
}));

describe('sRPSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error when fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(SRPService.fetchSRPReports).mockRejectedValue(new Error('API Error'));

    const wrapper = mount(SRPSummary, { props: { flawId: 'flaw-123' } });
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to load SRP reports');
  });

  it('displays empty state with add button', async () => {
    vi.mocked(SRPService.fetchSRPReports).mockResolvedValue([]);

    const wrapper = mount(SRPSummary, { props: { flawId: 'flaw-123' } });
    await flushPromises();

    expect(wrapper.text()).toContain('No reports yet');
    expect(wrapper.text()).toContain('Add Report');
  });

  it('renders report table', async () => {
    vi.mocked(SRPService.fetchSRPReports).mockResolvedValue([mockSRPReport]);

    const wrapper = mount(SRPSummary, { props: { flawId: 'flaw-123' } });
    await flushPromises();

    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Event Type');
  });

  it('does not fetch without flawId', async () => {
    mount(SRPSummary, { props: { flawId: '' } });
    await flushPromises();

    expect(SRPService.fetchSRPReports).not.toHaveBeenCalled();
  });

  it('handles save milestone errors', async () => {
    vi.mocked(SRPService.fetchSRPReports).mockResolvedValue([mockSRPReport]);
    vi.mocked(SRPService.createAdditionalInfoMilestone).mockRejectedValue(new Error('Update failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = mount(SRPSummary, { props: { flawId: 'flaw-123' } });
    await flushPromises();

    // Set editingReportUuid so the function executes the create path
    (wrapper.vm as any).editingReportUuid = 'report-uuid-123';
    await (wrapper.vm as any).handleSaveMilestone({ status: 'submitted' });
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith('Failed to save SRP milestone:', expect.any(Error));
  });

  it('handles save report errors', async () => {
    vi.mocked(SRPService.fetchSRPReports).mockResolvedValue([mockSRPReport]);
    vi.mocked(SRPService.updateSRPReport).mockRejectedValue(new Error('Save failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const wrapper = mount(SRPSummary, { props: { flawId: 'flaw-123' } });
    await flushPromises();

    // Set editingReport to trigger the update path
    (wrapper.vm as any).editingReport = mockSRPReport;
    await (wrapper.vm as any).handleSaveReport({ title: 'Updated' });
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith('Failed to save SRP report:', expect.any(Error));
  });
});
