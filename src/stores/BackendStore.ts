import { ref } from 'vue';
import { defineStore } from 'pinia';


export interface OsimBackends {
  osidb: string | unknown;
  isReady: () => boolean;
  error: boolean | string;
}

export const useBackendStore = defineStore('BackendStore', () => {
  const error = ref<string>('');
  const osidb = ref<string>('');

  function isReady() {
    return osidb.value !== '';
  }

  return {
    error,
    osidb,
    isReady,
  };
});
