import { VueWrapper, mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import Navbar from '@/components/Navbar/Navbar.vue';

import router from '@/router';
import { useToastStore, type ToastAdded } from '@/stores/ToastStore';
import { useSettingsStore } from '@/stores/SettingsStore';

describe('navbar', () => {
  let subject: VueWrapper<InstanceType<typeof Navbar>>;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides widget test option when not dev environment', () => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      stubActions: false,
    });
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ],
      },
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
      },
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ],
      },
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
      // @ts-expect-error missing properties
      toasts: [{}, {}],
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: true,
      },
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ],
      },
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
      },
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ],
      },
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
    const newToasts: ToastAdded[] = Array.from({ length: 1000 });
    toastStore.$state = {
      toasts: newToasts,
    };
    const settingStore = useSettingsStore(pinia);
    settingStore.$state = {
      settings: {
        ...settingStore.$state.settings,
        showNotifications: false,
      },
    };
    subject = mount(Navbar, {
      global: {
        plugins: [
          pinia,
          router,
        ],
      },
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
