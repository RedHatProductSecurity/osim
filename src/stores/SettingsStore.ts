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
  trackersPerPage: z.number(),
  isHidingLabels: z.boolean().optional().default(false),
  privacyNoticeShown: z.boolean().default(false),
});

export type SettingsType = z.infer<typeof SettingsSchema>;

const defaultValues: SettingsType = {
  bugzillaApiKey: '',
  jiraApiKey: '',
  showNotifications: false,
  affectsPerPage: 10,
  trackersPerPage: 10,
  isHidingLabels: false,
  privacyNoticeShown: false,
};
const osimSettings = useStorage('OSIM::USER-SETTINGS', structuredClone(defaultValues));

export const useSettingsStore = defineStore('SettingsStore', () => {
  const settings = ref<SettingsType>(osimSettings.value);
  // const settings = useSessionStorage(_settingsStoreKey, {} as SettingsType);

  const validatedSettings = SettingsSchema.safeParse(settings.value);
  if (validatedSettings.success) {
    if (JSON.stringify(validatedSettings.data) !== JSON.stringify(settings.value)) {
      settings.value = validatedSettings.data;
    }
  } else {
    settings.value = structuredClone(defaultValues);
  }

  watch(settings, () => {
    osimSettings.value = settings.value;
  });

  function save(newSettings: SettingsType) {
    settings.value = { ...newSettings };
  }

  function $reset() {
    settings.value = structuredClone(defaultValues);
  }

  return {
    $reset,
    save,
    settings,
  };
});
