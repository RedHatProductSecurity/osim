import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';

import { useSettingsStore, type PersistentSettingsType } from '@/stores/SettingsStore';

const initialState: PersistentSettingsType = {
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
  isHidingLabels: false,
  privacyNoticeShown: true,
  unifiedCommentsView: false,
  affectsColumnWidths: [],
  trackersColumnWidths: [],
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
      showNotifications: !initialState.showNotifications,
      affectsPerPage: 1337,
      trackersPerPage: 1337,
      isHidingLabels: !initialState.isHidingLabels,
      privacyNoticeShown: false,
      unifiedCommentsView: false,
      affectsColumnWidths: [],
      trackersColumnWidths: [],
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
