import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import SRPSummary from '@/components/CRA/SRPSummary.vue';
import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

import * as SRPService from '@/services/SRPService';

vi.mock('@/services/SRPService', () => ({
  fetchSRPReports: vi.fn(),
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

  it('displays no report message', async () => {
    vi.mocked(SRPService.fetchSRPReports).mockResolvedValue([]);

    const wrapper = mount(SRPSummary, { props: { flawId: 'flaw-123' } });
    await flushPromises();

    expect(wrapper.text()).toContain('No SRP reporting required');
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
});
