import { VueWrapper, mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';

import { useToastStore } from '@/stores/ToastStore';
import { useSettingsStore } from '@/stores/SettingsStore';

import Navbar from '../Navbar.vue';

describe('Navbar', async () => {
  let subject: VueWrapper<InstanceType<typeof Navbar>>;
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
        height: 100,
      }))
    }));

    vi.mock('jwt-decode', () => ({
      default: vi.fn(() => ({
        sub: '1234567890',
        name: 'Test User',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365),
      })),
    }));

    router.push('/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides widget test option when not dev environment', () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    vi.mock('@/stores/osimRuntime', async () => {
      const osimRuntimeValue = { env: 'unittest' };
      return {
        osimRuntime: {
          ...osimRuntimeValue,
        }
      };
    });
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const listItems = subject.findAll('.dropdown-item');
    let widgetTestOptionExists = false;
    for (const item of listItems) {
      if (item.text() === 'Widget Test') {
        widgetTestOptionExists = true;
        break;
      }
    }
    expect(widgetTestOptionExists).toBe(false);
  });

  it('renders show notification icon with empty notification count', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      toasts: [],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: true,
      }
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const button = subject.find('.osim-notification-button');
    expect(button.exists()).toBeTruthy();
    const icon = button.find('.notification-icon');
    expect(icon.classes()).toContain('bi-bell-fill');
    const badge = button.find('.osim-notification-count');
    expect(badge.exists()).toBeTruthy();
  });

  it('renders show notification icon with notification count', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      //@ts-expect-error missing properties
      toasts: [{}, {}],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: true
      }
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const button = subject.find('.osim-notification-button');
    expect(button.exists()).toBeTruthy();
    let icon = button.find('.notification-icon');
    expect(icon.classes()).toContain('bi-bell-fill');
    const badge = button.find('.osim-notification-count');
    expect(badge.exists()).toBeTruthy();
    expect(badge.text()).toBe('2');
    await icon.trigger('click');
    expect(settingStore.settings.showNotifications).toBe(false);
    icon = subject.find('.osim-notification-button .notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-slash-fill');
  });

  it('renders hide notification icon with empty notification count', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    toastStore.$state = {
      toasts: [],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: false,
      }
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const button = subject.find('.osim-notification-button');
    expect(button.exists()).toBeTruthy();
    const icon = button.find('.notification-icon');
    expect(icon.classes()).toContain('bi-bell-slash-fill');
    const badge = button.find('.osim-notification-count');
    expect(badge.exists()).toBeTruthy();
  });

  it('renders hide notification icon with notification count', async () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    const toastStore = useToastStore(pinia);
    const newToasts = new Array(1000);
    toastStore.$state = {
      toasts: newToasts,
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: false,
      }
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ]
      }
    });
    const button = subject.find('.osim-notification-button');
    expect(button.exists()).toBeTruthy();
    let icon = button.find('.notification-icon');
    expect(icon.classes()).toContain('bi-bell-slash-fill');
    const badge = button.find('.osim-notification-count');
    expect(badge.exists()).toBeTruthy();
    expect(badge.text()).toBe('99+');
    await icon.trigger('click');
    expect(settingStore.settings.showNotifications).toBe(true);
    icon = subject.find('.osim-notification-button .notification-icon');
    expect(icon.exists()).toBeTruthy();
    expect(icon.classes()).toContain('bi-bell-fill');
  });
});
