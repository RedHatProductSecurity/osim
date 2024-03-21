import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { z } from 'zod';

import serviceWorkerClient from '../services/service-worker-client';


// Consideration: we may want some settings to be persistently stored,
//   but other settings must be in-memory only, e.g. api keys

const _settingsStoreKey = 'SettingsStore';


export const SettingsSchema = z.object({
  // bugzillaApiKey: z.string().length(
  //   32, {message: 'Bugzilla API Key is the wrong length!'}
  // ).optional(),
  bugzillaApiKey: z.string().optional().or(z.literal('')),
  jiraApiKey: z.string().optional().or(z.literal('')),
  showNotifications: z.boolean(),
});
export type SettingsType = z.infer<typeof SettingsSchema>;

// const settingsStoreSessionStorage = z.object({
//   settings: SettingsSchema,
// });
// type SettingsStoreSessionStorage = z.infer<typeof settingsStoreSessionStorage>;


export const useSettingsStore = defineStore('SettingsStore', () => {
  const settings = ref<SettingsType>({ showNotifications: false });
  // const settings = useSessionStorage(_settingsStoreKey, {} as SettingsType);
  serviceWorkerClient.listen(_settingsStoreKey, value => {
    const newSettingsStore = SettingsSchema.safeParse(value);
    if (newSettingsStore.success) {
      if (JSON.stringify(newSettingsStore.data) !== JSON.stringify(settings.value)) {
        // New value; update
        settings.value = newSettingsStore.data;
      }
    }
  });
  watch(settings, () => {
    serviceWorkerClient.put(_settingsStoreKey, JSON.parse(JSON.stringify(settings.value)));
  });

  function save(newSettings: SettingsType) {
    settings.value = { ...newSettings };
  }

  function $reset() {
    settings.value = { showNotifications: false };
  }

  return {
    $reset,
    save,
    settings,
  };
});

