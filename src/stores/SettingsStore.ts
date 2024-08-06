import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { z } from 'zod';
import { useStorage } from '@vueuse/core';

export const SettingsSchema = z.object({
  // bugzillaApiKey: z.string().length(
  //   32, {message: 'Bugzilla API Key is the wrong length!'}
  // ).optional(),
  bugzillaApiKey: z.string().optional().or(z.literal('')).default(''),
  jiraApiKey: z.string().optional().or(z.literal('')).default(''),
  showNotifications: z.boolean(),
  affectsPerPage: z.number(),
});

export type SettingsType = z.infer<typeof SettingsSchema>;

const defaultValues: SettingsType = {
  bugzillaApiKey: '',
  jiraApiKey: '',
  showNotifications: false,
  affectsPerPage: 10
};
const osimSettings = useStorage('OSIM::USER-SETTINGS', defaultValues);

export const useSettingsStore = defineStore('SettingsStore', () => {
  const settings = ref<SettingsType>(osimSettings.value);
  // const settings = useSessionStorage(_settingsStoreKey, {} as SettingsType);

  const validatedSettings = SettingsSchema.safeParse(settings.value);
  if (validatedSettings.success) {
    if (JSON.stringify(validatedSettings.data) !== JSON.stringify(settings.value)) {

      settings.value = validatedSettings.data;
    }
  } else {
    settings.value = defaultValues;
  }

  watch(settings, () => {
    osimSettings.value = settings.value;
  });

  function save(newSettings: SettingsType) {
    settings.value = { ...newSettings };
  }

  function $reset() {
    settings.value = {
      showNotifications: false,
      bugzillaApiKey: '',
      jiraApiKey: '',
      affectsPerPage: 10,
    };
  }

  return {
    $reset,
    save,
    settings,
  };
});

