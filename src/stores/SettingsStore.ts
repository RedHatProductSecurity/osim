import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';

import { useToastStore } from './ToastStore';

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

export const useSettingsStore = defineStore('SettingsStore', () => {
  const { addToast } = useToastStore();

  const settings = useLocalStorage('OSIM::USER-SETTINGS', structuredClone(defaultValues));

  const validatedSettings = SettingsSchema.safeParse(settings.value);
  if (validatedSettings.success) {
    if (JSON.stringify(validatedSettings.data) !== JSON.stringify(settings.value)) {
      settings.value = validatedSettings.data;
    }
  } else {
    settings.value = structuredClone(defaultValues);
  }

  if (!settings.value.privacyNoticeShown) {
    addToast({
      title: 'Privacy Notice',
      body: 'OSIM transmits input information externally to Bugzilla for the purpose of retrieving bug data.' +
      ' In some cases that information may be publicly visible.',
    });
    settings.value.privacyNoticeShown = true;
  }

  // This is to remove previous privacy notice shown flag
  // Can be removed in future versions, when we are sure that all users have updated to the latest version
  if (localStorage.getItem('privacyNoticeShown')) {
    localStorage.removeItem('privacyNoticeShown');
  }

  function $reset() {
    settings.value = structuredClone(defaultValues);
  }

  return {
    $reset,
    settings,
  };
});
