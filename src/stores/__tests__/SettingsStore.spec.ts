import { describe, it, expect } from 'vitest';

import { useSettingsStore } from '../SettingsStore';

import { createTestingPinia } from '@pinia/testing';

import { createPinia, setActivePinia } from 'pinia';

// While not used in this file, store below depends on global pinia test instance
export const mockSettingsStore = createTestingPinia({
  initialState: {
    bugzillaApiKey: '',
    jiraApiKey: '',
    showNotification:true
  }
});

describe('SettingsStore', () => {
  let settingsStore: ReturnType<typeof useSettingsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    settingsStore = useSettingsStore();
  });

  it('initializes', () => {
    expect(settingsStore.$state.settings).toEqual({showNotifications: false});
  });
  it('saves values', () => {
    settingsStore.save({
      bugzillaApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      jiraApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      showNotifications: true
    });
    expect(
      settingsStore.settings.bugzillaApiKey === 'beep-beep-who-got-the-keys-to-the-jeep'
    );
    expect(
      settingsStore.settings.jiraApiKey === 'beep-beep-who-got-the-keys-to-the-jeep'
    );
    expect(
      settingsStore.settings.showNotifications 
    ).toBe(true);
  });
  it('reset', () => {
    settingsStore.settings.showNotifications = true;
    settingsStore.$reset();
    expect(settingsStore.settings.showNotifications).toBe(false);
  });
});
