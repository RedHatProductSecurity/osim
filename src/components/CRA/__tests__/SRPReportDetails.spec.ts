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
});
