import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';

import { useSettingsStore, type SettingsType } from '@/stores/SettingsStore';

const initialState: SettingsType = {
  bugzillaApiKey: '',
  jiraApiKey: '',
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
  isHidingLabels: false,
  privacyNoticeShown: true,
  unifiedCommentsView: false,
};

// While not used in this file, store below depends on global pinia test instance
export const mockSettingsStore = createTestingPinia({
  initialState,
});

describe('settingsStore', () => {
  let settingsStore: ReturnType<typeof useSettingsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    settingsStore = useSettingsStore();
  });

  it('initializes', () => {
    expect(settingsStore.$state.settings).toEqual(initialState);
  });

  it('saves values', () => {
    const settings = {
      bugzillaApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      jiraApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      showNotifications: !initialState.showNotifications,
      affectsPerPage: 1337,
      trackersPerPage: 1337,
      isHidingLabels: !initialState.isHidingLabels,
      privacyNoticeShown: false,
      unifiedCommentsView: false,
    };

    settingsStore.settings = settings;

    expect(settingsStore.settings).toEqual(settings);
  });

  it('reset', () => {
    settingsStore.settings.showNotifications = true;
    settingsStore.$reset();

    expect(settingsStore.settings.showNotifications).toBe(false);
  });
});
