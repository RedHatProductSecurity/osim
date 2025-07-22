import { ref } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';

import { saveApiKeysToBackend, getApiKeysFromBackend } from '@/services/ApiKeyService';

import { useToastStore } from './ToastStore';

export const ApiKeysSchema = z.object({
  bugzillaApiKey: z.string().optional().or(z.literal('')).default(''),
  jiraApiKey: z.string().optional().or(z.literal('')).default(''),
});

export const PersistentSettingsSchema = z.object({
  showNotifications: z.boolean(),
  affectsPerPage: z.number(),
  trackersPerPage: z.number(),
  isHidingLabels: z.boolean().optional().default(false),
  privacyNoticeShown: z.boolean().default(false),
  unifiedCommentsView: z.boolean().default(false),
  affectsColumnWidths: z.array(z.number()).default([]),
  trackersColumnWidths: z.array(z.number()).default([]),
});

export const SettingsSchema = ApiKeysSchema.merge(PersistentSettingsSchema);

export type SettingsType = z.infer<typeof SettingsSchema>;
export type ApiKeysType = z.infer<typeof ApiKeysSchema>;
export type PersistentSettingsType = z.infer<typeof PersistentSettingsSchema>;

const defaultApiKeys: ApiKeysType = {
  bugzillaApiKey: '',
  jiraApiKey: '',
};

const defaultPersistentSettings: PersistentSettingsType = {
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
  isHidingLabels: false,
  privacyNoticeShown: false,
  unifiedCommentsView: false,
  affectsColumnWidths: [],
  trackersColumnWidths: [],
};

const LEGACY_SETTINGS_KEY = 'OSIM::USER-SETTINGS';

async function migrateApiKeysFromLocalStorage(apiKeys: any, persistentSettings: any, addToast: any) {
  try {
    const legacySettings = JSON.parse(localStorage.getItem(LEGACY_SETTINGS_KEY) ?? '{}');

    const hasLegacyApiKeys = legacySettings.bugzillaApiKey || legacySettings.jiraApiKey;
    if (!hasLegacyApiKeys) {
      return;
    }

    console.log('🔄 Migrating API keys from localStorage to backend...');

    const keysToMigrate: any = {};
    if (legacySettings.bugzillaApiKey) {
      keysToMigrate.bugzilla = legacySettings.bugzillaApiKey;
    }
    if (legacySettings.jiraApiKey) {
      keysToMigrate.jira = legacySettings.jiraApiKey;
    }

    await saveApiKeysToBackend(keysToMigrate);

    const retrievedKeys = await getApiKeysFromBackend();

    apiKeys.value = {
      bugzillaApiKey: retrievedKeys.bugzilla || '',
      jiraApiKey: retrievedKeys.jira || '',
    };

    const cleanedSettings = { ...legacySettings };
    delete cleanedSettings.bugzillaApiKey;
    delete cleanedSettings.jiraApiKey;

    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(cleanedSettings));

    addToast({
      title: 'API Keys Migrated',
      body: 'Your API keys have been securely moved to the server and will no longer be stored in your browser.',
      css: 'success',
    });

    console.log('✅ API keys migration completed successfully');
  } catch (error) {
    console.error('❌ Failed to migrate API keys:', error);
    addToast({
      title: 'Migration Warning',
      body: 'Failed to migrate API keys to server. You may need to re-enter them in Settings.',
      css: 'warning',
    });
  }
}

export const useSettingsStore = defineStore('SettingsStore', () => {
  const { addToast } = useToastStore();

  const apiKeys = ref<ApiKeysType>(structuredClone(defaultApiKeys));

  const isLoadingApiKeys = ref<boolean>(false);
  const isSavingApiKeys = ref<boolean>(false);

  const persistentSettings = useLocalStorage('OSIM::USER-SETTINGS', structuredClone(defaultPersistentSettings));

  const validatedPersistentSettings = PersistentSettingsSchema.safeParse(persistentSettings.value);
  if (validatedPersistentSettings.success) {
    if (JSON.stringify(validatedPersistentSettings.data) !== JSON.stringify(persistentSettings.value)) {
      persistentSettings.value = validatedPersistentSettings.data;
    }
  } else {
    persistentSettings.value = structuredClone(defaultPersistentSettings);
  }

  if (!persistentSettings.value.privacyNoticeShown) {
    addToast({
      title: 'Privacy Notice',
      body: 'OSIM transmits input information externally to Bugzilla for the purpose of retrieving bug data.' +
      ' In some cases that information may be publicly visible.',
    });
    persistentSettings.value.privacyNoticeShown = true;
  }

  async function loadApiKeysFromBackend() {
    try {
      isLoadingApiKeys.value = true;
      const retrievedKeys = await getApiKeysFromBackend();
      apiKeys.value = {
        bugzillaApiKey: retrievedKeys.bugzilla || '',
        jiraApiKey: retrievedKeys.jira || '',
      };
    } catch (error) {
      console.debug('No API keys found on server or failed to retrieve them');
    } finally {
      isLoadingApiKeys.value = false;
    }
  }

  const isTestEnvironment = (typeof window !== 'undefined' && (window as any).__vitest__ !== undefined)
    || (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');

  if (!isTestEnvironment) {
    Promise.resolve()
      .then(() => loadApiKeysFromBackend())
      .then(() => migrateApiKeysFromLocalStorage(apiKeys, persistentSettings, addToast))
      .catch((error) => {
        console.error('Error during API keys initialization:', error);
      });
  }

  const settings = persistentSettings;

  function $reset() {
    apiKeys.value = structuredClone(defaultApiKeys);
    persistentSettings.value = structuredClone(defaultPersistentSettings);
  }

  async function updateApiKeys(newApiKeys: Partial<ApiKeysType>) {
    try {
      isSavingApiKeys.value = true;
      console.log('SettingsStore: updateApiKeys called with:', newApiKeys);

      apiKeys.value = {
        ...apiKeys.value,
        ...newApiKeys,
      };

      const keysToSave: any = {};
      if (newApiKeys.bugzillaApiKey !== undefined) {
        keysToSave.bugzilla = newApiKeys.bugzillaApiKey;
      }
      if (newApiKeys.jiraApiKey !== undefined) {
        keysToSave.jira = newApiKeys.jiraApiKey;
      }

      console.log('SettingsStore: keysToSave (backend format):', keysToSave);
      await saveApiKeysToBackend(keysToSave);

      addToast({
        title: 'Success!',
        body: 'API keys updated and saved securely',
        css: 'success',
      });
    } catch (error) {
      console.error('Failed to update API keys:', error);
      addToast({
        title: 'Error',
        body: 'Failed to save API keys. Please try again.',
        css: 'danger',
      });
      throw error;
    } finally {
      isSavingApiKeys.value = false;
    }
  }

  return {
    $reset,
    settings,
    apiKeys,
    isLoadingApiKeys,
    isSavingApiKeys,
    updateApiKeys,
  };
});
