import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';

import {
  useSettingsStore,
  type SettingsType,
  type ApiKeysType,
  type PersistentSettingsType,
} from '@/stores/SettingsStore';

const initialApiKeys: ApiKeysType = {
  bugzillaApiKey: '',
  jiraApiKey: '',
};

const initialPersistentSettings: PersistentSettingsType = {
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
  isHidingLabels: false,
  privacyNoticeShown: true,
  unifiedCommentsView: false,
};

const initialState: SettingsType = {
  ...initialApiKeys,
  ...initialPersistentSettings,
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
    expect(settingsStore.settings).toEqual(initialState);
    expect(settingsStore.apiKeys).toEqual(initialApiKeys);
    expect(settingsStore.persistentSettings).toEqual(initialPersistentSettings);
  });

  it('saves values via computed settings', () => {
    // Update API keys directly
    settingsStore.apiKeys.bugzillaApiKey = 'beep-beep-who-got-the-keys-to-the-jeep';
    settingsStore.apiKeys.jiraApiKey = 'beep-beep-who-got-the-keys-to-the-jeep';

    // Update persistent settings
    settingsStore.persistentSettings.showNotifications = !initialPersistentSettings.showNotifications;
    settingsStore.persistentSettings.affectsPerPage = 1337;
    settingsStore.persistentSettings.trackersPerPage = 1337;
    settingsStore.persistentSettings.isHidingLabels = !initialPersistentSettings.isHidingLabels;
    settingsStore.persistentSettings.privacyNoticeShown = false;
    settingsStore.persistentSettings.unifiedCommentsView = false;

    const expectedSettings = {
      bugzillaApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      jiraApiKey: 'beep-beep-who-got-the-keys-to-the-jeep',
      showNotifications: !initialPersistentSettings.showNotifications,
      affectsPerPage: 1337,
      trackersPerPage: 1337,
      isHidingLabels: !initialPersistentSettings.isHidingLabels,
      privacyNoticeShown: false,
      unifiedCommentsView: false,
    };

    expect(settingsStore.settings).toEqual(expectedSettings);
  });

  it('updateApiKeys function', async () => {
    const newKeys = {
      bugzillaApiKey: 'new-bugzilla-key',
      jiraApiKey: 'new-jira-key',
    };

    await settingsStore.updateApiKeys(newKeys);

    expect(settingsStore.apiKeys).toEqual(newKeys);
    expect(settingsStore.settings.bugzillaApiKey).toBe(newKeys.bugzillaApiKey);
    expect(settingsStore.settings.jiraApiKey).toBe(newKeys.jiraApiKey);
  });

  it('reset', () => {
    // Modify settings
    settingsStore.apiKeys.bugzillaApiKey = 'test-key';
    settingsStore.persistentSettings.showNotifications = true;

    // Reset
    settingsStore.$reset();

    expect(settingsStore.apiKeys).toEqual(initialApiKeys);
    expect(settingsStore.persistentSettings).toEqual(initialPersistentSettings);
    expect(settingsStore.settings).toEqual(initialState);
  });
});
