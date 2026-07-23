import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRPPayloadDialog from '@/components/CRA/SRPPayloadDialog.vue';
import { mockSRPReport } from '@/components/CRA/__tests__/fixtures';

describe('sRPPayloadDialog', () => {
  it('renders when show is true', () => {
    const wrapper = mount(SRPPayloadDialog, {
      props: { report: mockSRPReport, show: true },
    });
    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('does not render when show is false', () => {
    const wrapper = mount(SRPPayloadDialog, {
      props: { report: mockSRPReport, show: false },
    });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(SRPPayloadDialog, {
      props: { report: mockSRPReport, show: true },
    });
    await wrapper.find('.btn-close').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
