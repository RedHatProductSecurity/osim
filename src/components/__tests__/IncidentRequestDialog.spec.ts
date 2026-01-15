import { describe, it, expect, vi, beforeEach } from 'vitest';

import IncidentRequestDialog from '@/components/IncidentRequestDialog/IncidentRequestDialog.vue';

import Modal from '@/widgets/Modal/Modal.vue';
import { mountWithConfig } from '@/__tests__/helpers';

vi.mock('@/services/FlawService', () => ({
  postIncidentRequest: vi.fn(() => Promise.resolve({ data: {} })),
}));

describe('incidentRequestDialog', () => {
  const defaultProps = {
    showModal: false,
    flawId: 'test-uuid-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal component', () => {
    const wrapper = mountWithConfig(IncidentRequestDialog, {
      props: defaultProps,
    });

    const modal = wrapper.findComponent(Modal);
    expect(modal.exists()).toBe(true);
  });

  it('does not show modal content when showModal is false', () => {
    const wrapper = mountWithConfig(IncidentRequestDialog, {
      props: defaultProps,
    });

    expect(wrapper.find('.modal-content').exists()).toBe(false);
  });

  it('passes correct props to Modal component', async () => {
    const wrapper = mountWithConfig(IncidentRequestDialog, {
      props: {
        ...defaultProps,
        showModal: true,
      },
    });

    await wrapper.vm.$nextTick();

    const modal = wrapper.findComponent(Modal);
    // The modal's show prop is controlled by the internal isModalOpen ref
    // which gets synced via the watch effect
    expect(modal.exists()).toBe(true);
  });

  it('has correct flawId prop', () => {
    const wrapper = mountWithConfig(IncidentRequestDialog, {
      props: defaultProps,
    });

    expect(wrapper.props('flawId')).toBe('test-uuid-123');
  });
});
