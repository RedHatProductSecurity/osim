import { mount } from '@vue/test-utils';

import SRPStatusBadge from '@/components/CRA/SRPStatusBadge.vue';

describe('srpStatusBadge', () => {
  it('renders status badge', () => {
    const wrapper = mount(SRPStatusBadge, {
      props: { status: 'required' },
    });

    expect(wrapper.find('.badge').text()).toBe('required');
  });

  it('renders overdue badge', () => {
    const wrapper = mount(SRPStatusBadge, {
      props: { overdueMilestones: 2, status: 'required' },
    });

    expect(wrapper.text()).toContain('2 Overdue');
  });

  it('renders placeholder when no status', () => {
    const wrapper = mount(SRPStatusBadge, {
      props: { status: null },
    });

    expect(wrapper.text()).toBe('—');
  });
});
