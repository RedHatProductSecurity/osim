import { VueWrapper, mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import router from '@/router';
import { createTestingPinia } from "@pinia/testing";

import Toast from "../Toast.vue";
import { useSettingsStore } from "@/stores/SettingsStore";
import { DateTime } from "luxon";
import ProgressRing from "../ProgressRing.vue";

describe("Toast", async () => {
  let subject: VueWrapper<InstanceType<typeof Toast>>;
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("render toast body, header", async () => {
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
    subject = mount(Toast, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      },
      props: {
        title: "Toast",
        body: "body",
        timestamp: DateTime.now(),
        timeoutMs: 10000,
      }
    });
    const toast = subject.find('.osim-toast');
    expect(toast.exists()).toBeTruthy();
    const toastHeader = toast.find('.toast-header');
    expect(toastHeader.exists()).toBeTruthy();
    const toastTitle = toastHeader.find('.me-auto');
    expect(toastTitle.exists()).toBeTruthy();
    expect(toastTitle.text()).toBe('Toast');
    const toastBody = toast.find('.toast-body');
    expect(toastBody.exists()).toBeTruthy();
    const progressRingElement = subject.findAllComponents(ProgressRing);
    expect(progressRingElement.length).toBe(1);
  });

  it("trigger close event", async () => {
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
    subject = mount(Toast, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      },
      props: {
        title: "Toast",
        body: "body",
        timestamp: DateTime.now(),
        timeoutMs: 10000,
        onClose: vitest.fn,
      }
    });
    const toast = subject.find('.osim-toast');
    expect(toast.exists()).toBeTruthy();
    const closeButton = toast.find('.btn-close');
    expect(closeButton.exists()).toBeTruthy();
    await closeButton.trigger('click');
    expect(subject.emitted('close')).toBeTruthy();
  });

  it("trigger close event after timeoutMs", async () => {
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
    subject = mount(Toast, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      },
      props: {
        title: "Toast",
        body: "body",
        timestamp: DateTime.now(),
        timeoutMs: 1000,
        onClose: vitest.fn,
      }
    });
    const toast = subject.find('.osim-toast');
    expect(toast.exists()).toBeTruthy();
    const closeButton = toast.find('.btn-close');
    expect(closeButton.exists()).toBeTruthy();
    vi.advanceTimersByTime(7000);
    await flushPromises();
    expect(subject.emitted('close')).toBeTruthy();
  });

  it("trigger stale event after freshMs", async () => {
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
    subject = mount(Toast, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      },
      props: {
        title: "Toast",
        body: "body",
        timestamp: DateTime.now(),
        timeoutMs: 10000,
        onClose: vitest.fn,
        onStale: vitest.fn
      }
    });
    const toast = subject.find('.osim-toast');
    expect(toast.exists()).toBeTruthy();
    const closeButton = toast.find('.btn-close');
    expect(closeButton.exists()).toBeTruthy();
    vi.advanceTimersByTime(11000);
    await flushPromises();
    expect(subject.emitted('stale')).toBeTruthy();
    vi.advanceTimersByTime(5000);
    await flushPromises();
    expect(subject.emitted('close')).toBeTruthy();
  });
});

