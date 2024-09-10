import { createPinia, setActivePinia } from 'pinia';

import { useToastStore, type ToastNew } from '@/stores/ToastStore';

import { useSettingsStore } from '../SettingsStore';

describe('toastStore', () => {
  let toastStore: ReturnType<typeof useToastStore>;
  let settingsStore: ReturnType<typeof useSettingsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    settingsStore = useSettingsStore();
    toastStore = useToastStore();
  });

  it('addToast', () => {
    settingsStore.settings.showNotifications = true;

    const toast: ToastNew = { body: 'Test Toast' };

    toastStore.addToast(toast);

    expect(toastStore.toasts).toHaveLength(1);
    expect(toastStore.toasts[0].isFresh).toBe(true);
  });

  it('reset', () => {
    const toast: ToastNew = { body: 'Test Toast' };
    toastStore.addToast(toast);
    expect(toastStore.toasts).toHaveLength(1);
    toastStore.$reset();
    expect(toastStore.toasts).toHaveLength(0);
  });
});
