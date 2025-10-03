import { ref, watch } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';

import {
  saveApiKeysToBackend,
  getApiKeysFromBackend,
  notifyApiKeyUnset,
  type IntegrationTokensPatchRequest,
} from '@/services/ApiKeyService';

import { useToastStore } from './ToastStore';
import { osimRuntime } from './osimRuntime';

export const ApiKeysSchema = z.object({
  bugzillaApiKey: z.string().optional().or(z.literal('')).default(''),
  jiraApiKey: z.string().optional().or(z.literal('')).default(''),
});

export const PersistentSettingsSchema = z.object({
  showNotifications: z.boolean(),
  affectsPerPage: z.number(),
  affectsColumnOrder: z.array(z.string()),
  affectsSizing: z.record(z.number()),
  affectsVisibility: z.record(z.boolean()),
  trackersPerPage: z.number(),
  isHidingLabels: z.boolean().optional().default(false),
  privacyNoticeShown: z.boolean().default(false),
  aiUsageNoticeShown: z.boolean().default(false),
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
  aiUsageNoticeShown: false,
  unifiedCommentsView: false,
  affectsSizing: {},
  affectsVisibility: {},
  affectsColumnWidths: [],
  affectsColumnOrder: [],
  trackersColumnWidths: [],
};

const SETTINGS_KEY = 'OSIM::USER-SETTINGS';

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

  if (!persistentSettings.value.aiUsageNoticeShown) {
    addToast({
      title: 'AI Usage Notice',
      body:
        'You are about to use a Red Hat AI-powered system, which utilizes generative AI technology to '
        + 'provide you with relevant information. Please do not include any personal information in your '
        + 'queries. By proceeding to use the tool, you acknowledge that the tool and any output provided '
        + 'are only intended for internal use and that information should only be shared with those with a '
        + 'legitimate business purpose. Responses provided by tools utilizing AI technology should be '
        + 'reviewed and verified by a human prior to use.',
      css: 'info',
      timeoutMs: 0, // Don't auto-dismiss
    });
    persistentSettings.value.aiUsageNoticeShown = true;
  }

  // Migration: Move API keys from localStorage to backend
  // This can be removed once we're sure all users have migrated their API keys
  function migrateApiKeysFromLocalStorage() {
    const settings = persistentSettings.value as any;

    if (osimRuntime.value.env !== 'dev' && (settings.jiraApiKey || settings.bugzillaApiKey)) {
      const keysToMigrate: IntegrationTokensPatchRequest = {
        ...(settings.bugzillaApiKey && { bugzilla: settings.bugzillaApiKey }),
        ...(settings.jiraApiKey && { jira: settings.jiraApiKey }),
      };

      saveApiKeysToBackend(keysToMigrate)
        .then(() => addToast({
          title: 'API Keys Migrated',
          body: 'Your API keys have been securely moved to the server and will no longer be stored in your browser.',
          css: 'success',
        }))
        .catch(() => addToast({
          title: 'Migration Warning',
          body: 'Failed to migrate API keys to server. You may need to re-enter them in Settings.',
          css: 'warning',
        }))
        .finally(() => {
          delete (persistentSettings.value as any).jiraApiKey;
          delete (persistentSettings.value as any).bugzillaApiKey;
        });
    }
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

  const isApiKeysInitialized = ref(false);

  async function initializeApiKeys() {
    console.debug('SettingsStore: Setting up API keys initialization...');

    // Import UserStore dynamically to avoid circular dependencies
    const { useUserStore } = await import('./UserStore');
    const userStore = useUserStore();

    // Watch for authentication changes and load API keys when authenticated
    // Watch both isAuthenticated (computed from token) and isLoggedIn (boolean flag)
    // to handle any potential timing edge cases
    watch(
      () => ({
        isAuthenticated: userStore.isAuthenticated,
        isLoggedIn: userStore.isLoggedIn,
      }),
      async ({ isAuthenticated, isLoggedIn }) => {
        if (isAuthenticated && !isApiKeysInitialized.value) {
          try {
            console.debug('SettingsStore: User authenticated, loading API keys...');
            await loadApiKeysFromBackend();
            migrateApiKeysFromLocalStorage();
            isApiKeysInitialized.value = true;
            console.debug('✅ API keys initialized');

            if ((!apiKeys.value.bugzillaApiKey || !apiKeys.value.jiraApiKey) && !osimRuntime.value.readOnly) {
              notifyApiKeyUnset();
            }
          } catch (error) {
            console.error('SettingsStore: Error during API keys initialization:', error);
          }
        } else if (!isAuthenticated && !isLoggedIn) {
          // Reset API keys when user logs out (both flags should be false)
          apiKeys.value = structuredClone(defaultApiKeys);
          isApiKeysInitialized.value = false;
          console.debug('SettingsStore: User logged out, API keys cleared');
        }
      },
      { immediate: true },
    );
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
    isApiKeysInitialized,
    updateApiKeys,
    initializeApiKeys,
  };
});
