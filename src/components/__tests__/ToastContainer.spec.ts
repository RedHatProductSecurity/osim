import { VueWrapper, mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import ToastContainer from '@/components/ToastContainer/ToastContainer.vue';

import router from '@/router';
import { useToastStore } from '@/stores/ToastStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import Toast from '@/widgets/Toast/Toast.vue';

createTestingPinia();

describe('toastContainer', () => {
  let subject: VueWrapper<InstanceType<typeof ToastContainer>>;
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders toasts and clearAll button when showNotification is true', async () => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        showNotifications: true,
        privacyNoticeShown: true,
        aiUsageNoticeShown: true,
        affectsPerPage: 10,
        trackersPerPage: 10,
        isHidingLabels: false,
        unifiedCommentsView: false,
        affectsColumnWidths: [],
        trackersColumnWidths: [],
        affectsColumnOrder: [],
        affectsSizing: {},
        affectsVisibility: {},
      },
      apiKeys: {
        bugzillaApiKey: '',
        jiraApiKey: '',
      },
      isLoadingApiKeys: false,
      isSavingApiKeys: false,
      isApiKeysInitialized: false,
    };
    const toastStore = useToastStore(pinia);
    toastStore.addToast({
      title: 'Test',
      body: 'Test',
      timeoutMs: 15000,
    });
    toastStore.addToast({
      title: 'Test',
      body: 'Test',
    });
    subject = mount(ToastContainer, {
      global: {
        plugins: [
          pinia,
          router,
        ],
      },
    });
    const toastElements = subject.findAllComponents(Toast);
    expect(toastElements.length).toBe(4);
    const clearAllButton = subject.find('.osim-toast-container-clear button');
    expect(clearAllButton.exists()).toBeTruthy();
    await clearAllButton.trigger('click');
    await flushPromises();
    expect(toastStore.toasts.length).toBe(0);
  });

  it('renders empty toasts and hide clearAll button when showNotification is true', async () => {
    const settingStore = useSettingsStore();
    settingStore.$state = {
      settings: {
        showNotifications: true,
        privacyNoticeShown: true,
        aiUsageNoticeShown: true,
        affectsPerPage: 10,
        trackersPerPage: 10,
        isHidingLabels: false,
        unifiedCommentsView: false,
        affectsColumnWidths: [],
        trackersColumnWidths: [],
        affectsColumnOrder: [],
        affectsSizing: {},
        affectsVisibility: {},
      },
      apiKeys: {
        bugzillaApiKey: '',
        jiraApiKey: '',
      },
      isLoadingApiKeys: false,
      isSavingApiKeys: false,
      isApiKeysInitialized: false,
    };
    subject = mount(ToastContainer);
    const toastElements = subject.findAllComponents(Toast);
    expect(toastElements.length).toBe(0);
    const clearAllButton = subject.find('.osim-toast-container-clear button');
    expect(clearAllButton.exists()).toBeFalsy();
  });

  it(
    'renders temporary toasts and hide toasts after its timeoutMs when showNotification is false',
    async () => {
      const settingStore = useSettingsStore();
      settingStore.$state = {
        settings: {
          showNotifications: false,
          affectsPerPage: 10,
          trackersPerPage: 10,
          isHidingLabels: false,
          privacyNoticeShown: false,
          aiUsageNoticeShown: false,
          unifiedCommentsView: false,
          affectsColumnWidths: [],
          trackersColumnWidths: [],
          affectsColumnOrder: [],
          affectsSizing: {},
          affectsVisibility: {},
        },
        apiKeys: {
          bugzillaApiKey: '',
          jiraApiKey: '',
        },
        isLoadingApiKeys: false,
        isSavingApiKeys: false,
        isApiKeysInitialized: false,
      };
      const toastStore = useToastStore();
      toastStore.addToast({
        title: 'Test',
        body: 'Test',
        timeoutMs: 5000,
      });
      subject = mount(ToastContainer);
      settingStore.settings.privacyNoticeShown = true;
      const toastElements = subject.findAllComponents(Toast);
      expect(toastElements.length).toBe(1);
      vi.advanceTimersByTime(12000);
      await flushPromises();
      expect(toastStore.toasts.length).toBe(0);
    });
});
