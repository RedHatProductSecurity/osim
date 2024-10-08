import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';

import { useSettingsStore } from '../SettingsStore';

const initialState = {
  bugzillaApiKey: '',
  jiraApiKey: '',
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
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
    settingsStore.save({
      bugzillaApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      jiraApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      showNotifications: true,
      affectsPerPage: 10,
      trackersPerPage: 10,
    });
    expect(
      settingsStore.settings.bugzillaApiKey === 'beep-beep-who-got-the-keys-to-the-jeep',
    ).toBe(true);
    expect(
      settingsStore.settings.jiraApiKey === 'beep-beep-who-got-the-keys-to-the-jeep',
    ).toBe(true);
    expect(
      settingsStore.settings.showNotifications,
    ).toBe(true);
  });
  it('reset', () => {
    settingsStore.settings.showNotifications = true;
    settingsStore.$reset();
    expect(settingsStore.settings.showNotifications).toBe(false);
  });
});
