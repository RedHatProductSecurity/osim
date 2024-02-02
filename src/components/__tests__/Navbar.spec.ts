import { VueWrapper, mount } from "@vue/test-utils";
import { describe, it, expect} from "vitest";
import router from '@/router';
import { createTestingPinia } from "@pinia/testing";

import { useToastStore } from '@/stores/ToastStore';
import { useSettingsStore} from "@/stores/SettingsStore";

import Navbar from "../Navbar.vue";

describe("Navbar",async () => {
  let subject:  VueWrapper<InstanceType<typeof Navbar>>;
  beforeEach(() => {
    
    vi.mock('@vueuse/core', () => ({
      useSessionStorage: vi.fn(() => ({
        value: {
          // Set your fake user data here
          refresh: 'mocked_refresh_token',
          env: 'mocked_env',
          whoami: {
            email: 'test@example.com',
            username: 'testuser',
          },
        },
      })),
      useElementBounding: vi.fn(() => ({
        bottom: 1000,
        height: 100
      }))
    }));
    
    vi.mock('jwt-decode', () => ({
      default: vi.fn(() => ({
        sub: '1234567890',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
      })),
    }));
    
    router.push('/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  })

  it("renders show notification icon with empty notification count",async () => {
    const pinia =  createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      toasts: [],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      ...settingStore.$state,
      showNotification: true
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router
        ]
      }
    });
    const icon = subject.find('.notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-fill');
    const badge = icon.find('.notification-badge');
    expect(badge.exists()).toBeTruthy();
    expect(badge.text()).toBe('0');
  });

  it("renders show notification icon with notification count",async () => {
    const pinia =  createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      //@ts-ignore
      toasts: [{},{}],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      ...settingStore.$state,
      showNotification: true
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router
        ]
      }
    });
    let icon = subject.find('.notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-fill');
    const badge = icon.find('.notification-badge');
    expect(badge.exists()).toBeTruthy();
    expect(badge.text()).toBe('2');
    await icon.trigger("click");
    expect(settingStore.toggleNotification).toHaveBeenCalledOnce();
    icon = subject.find('.notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-slash-fill');
  });


  it("renders hide notification icon with empty notification count",async () => {
    const pinia =  createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      toasts: [],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      ...settingStore.$state,
      showNotification: false
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router
        ]
      }
    });
    const icon = subject.find('.notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-slash-fill');
    const badge = icon.find('.notification-badge');
    expect(badge.exists()).toBeTruthy();
    expect(badge.text()).toBe('0');
  });

  it("renders hide notification icon with notification count",async () => {
    const pinia =  createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      //@ts-ignore
      toasts: [{}, {}, {}],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      ...settingStore.$state,
      showNotification: false
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router
        ]
      }
    });
    let icon = subject.find('.notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-slash-fill');
    const badge = icon.find('.notification-badge');
    expect(badge.exists()).toBeTruthy();
    expect(badge.text()).toBe('3');
    await icon.trigger("click");
    expect(settingStore.toggleNotification).toHaveBeenCalledOnce();
    icon = subject.find('.notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-fill');
  });
});
