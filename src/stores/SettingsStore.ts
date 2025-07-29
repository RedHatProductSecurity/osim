import { ref } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';

import {
  saveApiKeysToBackend,
  getApiKeysFromBackend,
  type IntegrationTokensPatchRequest,
} from '@/services/ApiKeyService';

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

const SETTINGS_KEY = 'OSIM::USER-SETTINGS';

// Can be removed once we're sure all users have migrated their API keys
async function migrateApiKeysFromLocalStorage(apiKeys: any, persistentSettings: any, addToast: any) {
  const settings = persistentSettings.value;

  const hasApiKeys = !!settings.bugzillaApiKey || !!settings.jiraApiKey;
  if (!hasApiKeys) {
    return;
  }

  // Prepare keys for backend
  const keysToMigrate: IntegrationTokensPatchRequest = {
    ...(settings.bugzillaApiKey && { bugzilla: settings.bugzillaApiKey }),
    ...(settings.jiraApiKey && { jira: settings.jiraApiKey }),
  };

  try {
    await saveApiKeysToBackend(keysToMigrate);
    const retrievedKeys = await getApiKeysFromBackend();
    apiKeys.value = {
      bugzillaApiKey: retrievedKeys.bugzilla || '',
      jiraApiKey: retrievedKeys.jira || '',
    };

    addToast({
      title: 'API Keys Migrated',
      body: 'Your API keys have been securely moved to the server and will no longer be stored in your browser.',
      css: 'success',
    });
  } catch (error) {
    console.error('❌ Failed to migrate API keys:', error);
    addToast({
      title: 'Migration Warning',
      body: 'Failed to migrate API keys to server. You may need to re-enter them in Settings.',
      css: 'warning',
    });
  } finally {
    delete settings.bugzillaApiKey;
    delete settings.jiraApiKey;
  }
}

export const useSettingsStore = defineStore('SettingsStore', () => {
  const { addToast } = useToastStore();

  const apiKeys = ref<ApiKeysType>(structuredClone(defaultApiKeys));

  const isLoadingApiKeys = ref<boolean>(false);
  const isSavingApiKeys = ref<boolean>(false);

  const persistentSettings = useLocalStorage(SETTINGS_KEY, structuredClone(defaultPersistentSettings));

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
      console.debug('SettingsStore: No API keys found on server or failed to retrieve them:', error);
    } finally {
      isLoadingApiKeys.value = false;
    }
  }

  async function initializeApiKeys() {
    console.debug('SettingsStore: Initializing API keys...');
    try {
      // Check if user is authenticated before trying to load API keys
      const { useUserStore } = await import('./UserStore');
      const userStore = useUserStore();

      if (!userStore.isLoggedIn) {
        return;
      }

      await loadApiKeysFromBackend();
      await migrateApiKeysFromLocalStorage(apiKeys, persistentSettings, addToast);
      console.debug('SettingsStore: API keys initialization completed');
    } catch (error) {
      console.error('SettingsStore: Error during API keys initialization:', error);
    }
  }

  function $reset() {
    apiKeys.value = structuredClone(defaultApiKeys);
    persistentSettings.value = structuredClone(defaultPersistentSettings);
  }

  async function updateApiKeys(newApiKeys: Partial<ApiKeysType>) {
    try {
      isSavingApiKeys.value = true;

      apiKeys.value = {
        ...apiKeys.value,
        ...newApiKeys,
      };

      const keysToSave: IntegrationTokensPatchRequest = {
        ...(newApiKeys.bugzillaApiKey !== undefined && { bugzilla: newApiKeys.bugzillaApiKey }),
        ...(newApiKeys.jiraApiKey !== undefined && { jira: newApiKeys.jiraApiKey }),
      };

      await saveApiKeysToBackend(keysToSave);

      // Update Jira username if jiraApiKey was changed
      if (newApiKeys.jiraApiKey !== undefined) {
        const { useUserStore } = await import('./UserStore');
        const userStore = useUserStore();
        await userStore.updateJiraUsername();
      }

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
    settings: persistentSettings,
    apiKeys,
    isLoadingApiKeys,
    isSavingApiKeys,
    updateApiKeys,
    initializeApiKeys,
  };
});
