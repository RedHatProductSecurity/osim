import { VueWrapper, mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import router from '@/router';
import { createTestingPinia } from "@pinia/testing";

import ToastContainer from "../ToastContainer.vue";
import { useToastStore } from "@/stores/ToastStore";
import Toast from "../widgets/Toast.vue";
import { useSettingsStore } from "@/stores/SettingsStore";

describe("ToastContainer", async () => {
  let subject: VueWrapper<InstanceType<typeof ToastContainer>>;
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders toasts and clearAll button when showNotification is true", async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: true,
      }
    };
    const toastStore = useToastStore(pinia);
    toastStore.addToast({
      title: "Test",
      body: "Test",
      timeoutMs: 15000,
    });
    toastStore.addToast({
      title: "Test",
      body: "Test",
    });
    subject = mount(ToastContainer, {
      global: {
        plugins: [
          pinia,
          router
        ]
      }
    });
    const toastElements = subject.findAllComponents(Toast);
    expect(toastElements.length).toBe(2);
    const clearAllButton = subject.find('.osim-toast-container-clear button');
    expect(clearAllButton.exists()).toBeTruthy();
    await clearAllButton.trigger('click');
    await flushPromises();
    expect(toastStore.toasts.length).toBe(0);
  });

  it("renders empty toasts and hide clearAll button when showNotification is true", async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: true,
      }
    };
    subject = mount(ToastContainer, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const toastElements = subject.findAllComponents(Toast);
    expect(toastElements.length).toBe(0);
    const clearAllButton = subject.find('.osim-toast-container-clear button');
    expect(clearAllButton.exists()).toBeFalsy();
  });

  it("renders toasts and hide toasts after 10 seconds when showNotification is false", async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: false,
      }
    };
    const toastStore = useToastStore(pinia);
    toastStore.addToast({
      title: "Test",
      body: "Test",
    });
    subject = mount(ToastContainer, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const toastElements = subject.findAllComponents(Toast);
    expect(toastElements.length).toBe(1);
    vi.advanceTimersByTime(12000);
    await flushPromises();
    expect(toastStore.toasts.length).toBe(1);
    expect(toastStore.toasts[0].isFresh).toBe(false);
  });

  it("renders temporary toasts and hide toasts after its timeoutMs when showNotification is false", async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: false,
      }
    };
    const toastStore = useToastStore(pinia);
    toastStore.addToast({
      title: "Test",
      body: "Test",
      timeoutMs: 5000,
    });
    subject = mount(ToastContainer, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const toastElements = subject.findAllComponents(Toast);
    expect(toastElements.length).toBe(1);
    vi.advanceTimersByTime(12000);
    await flushPromises();
    expect(toastStore.toasts.length).toBe(0);
  });
});

