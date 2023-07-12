import {ref, unref} from 'vue';
import {defineStore} from 'pinia';
import {z} from 'zod';

// Consideration: we may want some settings to be persistently stored,
//   but other settings must be in-memory only, e.g. api keys

const _settingsStoreKey = 'SettingsStore';

export type SettingsType = {
  bugzillaApiKey?: string,
};

const settingsStoreSessionStorage = z.object({
  settings: z.object({
    bugzillaApiKey: z.string().optional(),
  }),
});
type SettingsStoreSessionStorage = z.infer<typeof settingsStoreSessionStorage>;


export const useSettingsStore = defineStore('SettingsStore', () => {
  const settings = ref<SettingsType>({});

  function save(newSettings: SettingsType) {
    settings.value = {...newSettings};
  }

  readSessionStorage(); // Initially read when loading SettingsStore
  function readSessionStorage() {
    let storedSettingsStore = sessionStorage.getItem(_settingsStoreKey);
    if (storedSettingsStore != null) {
      try {
        const settingsJson = JSON.parse(storedSettingsStore);
        const parsedSettingsStore: SettingsStoreSessionStorage = settingsStoreSessionStorage.parse(settingsJson);
        settings.value = parsedSettingsStore.settings;
      } catch (e) {
        console.error('UserStore: unable to restore from sessionStorage');
        // console.trace(e);
        $reset();
      }
    }
  }

  function $reset() {
    settings.value = {};
  }

  return {
    $reset,
    save,
    settings,
  };
});

