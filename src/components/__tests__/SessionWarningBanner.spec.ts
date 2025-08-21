import { ref } from 'vue';

import { mount, VueWrapper } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import SessionWarningBanner from '@/components/SessionWarningBanner/SessionWarningBanner.vue';

import { useToastStore } from '@/stores/ToastStore';

const mockIsAccessTokenExpiringInOneHour = ref(false);
const mockIsReauthenticating = ref(false);
const mockTimeUntilExpiration = ref({ hours: 0, minutes: 45 });
const mockReauthenticate = vi.fn();

vi.mock('@/composables/useSessionWarning', () => ({
  useSessionWarning: () => ({
    isAccessTokenExpiringInOneHour: mockIsAccessTokenExpiringInOneHour,
    isReauthenticating: mockIsReauthenticating,
    reauthenticate: mockReauthenticate,
    timeUntilExpiration: mockTimeUntilExpiration,
  }),
}));

vi.mock('@/stores/osimRuntime', () => ({
  osimRuntime: {
    value: {
      backends: {
        osidbAuth: 'kerberos',
      },
    },
  },
}));

describe('sessionWarningBanner', () => {
  let wrapper: VueWrapper<any>;
  let toastStore: any;

  const mountComponent = () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });
    toastStore = useToastStore(pinia);

    return mount(SessionWarningBanner, {
      global: {
        plugins: [pinia],
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAccessTokenExpiringInOneHour.value = false;
    mockIsReauthenticating.value = false;
    mockTimeUntilExpiration.value = { hours: 0, minutes: 45 };
    mockReauthenticate.mockReset();
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it('should not show banner when token is not expiring', () => {
    mockIsAccessTokenExpiringInOneHour.value = false;
    wrapper = mountComponent();

    expect(wrapper.find('.session-warning-banner').exists()).toBe(false);
  });

  it('should show banner when token is expiring and auth method is kerberos', () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    wrapper = mountComponent();

    expect(wrapper.find('.session-warning-banner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Session Expiring Soon');
    expect(wrapper.text()).toContain('Your session will expire in 45m');
  });

  it('should hide banner when dismissed', async () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    wrapper = mountComponent();

    const closeButton = wrapper.find('.btn-close');
    await closeButton.trigger('click');

    expect(wrapper.find('.session-warning-banner').exists()).toBe(false);
  });

  it('should call reauthenticate when extend button is clicked', async () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    wrapper = mountComponent();

    const extendButton = wrapper.find('.btn-warning');
    await extendButton.trigger('click');

    expect(mockReauthenticate).toHaveBeenCalled();
  });

  it('should show loading state during reauthentication', () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    mockIsReauthenticating.value = true;
    wrapper = mountComponent();

    const extendButton = wrapper.find('.btn-warning');
    expect(extendButton.text()).toContain('Extending...');
    expect(extendButton.attributes('disabled')).toBeDefined();
    expect(wrapper.find('.spinner-border').exists()).toBe(true);
  });

  it('should show success toast on successful reauthentication', async () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    mockReauthenticate.mockResolvedValue(undefined);
    wrapper = mountComponent();

    const extendButton = wrapper.find('.btn-warning');
    await extendButton.trigger('click');

    expect(toastStore.addToast).toHaveBeenCalledWith({
      title: 'Session Extended',
      body: 'Your session has been successfully extended.',
      css: 'success',
    });
  });

  it('should show error toast on failed reauthentication', async () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    const error = new Error('Reauthentication failed');
    mockReauthenticate.mockRejectedValue(error);
    wrapper = mountComponent();

    const extendButton = wrapper.find('.btn-warning');
    await extendButton.trigger('click');

    expect(toastStore.addToast).toHaveBeenCalledWith({
      title: 'Session Extension Failed',
      body: 'Unable to extend your session. Please log in again.',
      css: 'danger',
    });
  });

  it('should disable buttons during reauthentication', () => {
    mockIsAccessTokenExpiringInOneHour.value = true;
    mockIsReauthenticating.value = true;
    wrapper = mountComponent();

    const extendButton = wrapper.find('.btn-warning');
    const closeButton = wrapper.find('.btn-close');

    expect(extendButton.attributes('disabled')).toBeDefined();
    expect(closeButton.attributes('disabled')).toBeDefined();
  });
});
