// No need to use Pinia; these values are set on app startup and never changed.
// Named with camelCase instead of PascalCase to differentiate from Pinia stores.

import {computed, ref} from 'vue';
import {z} from 'zod';

// export enum OsimRuntimeDev {
//   PROD,
//   DEV,
//   MOCK,
// }
// export const osimRuntimeDev = OsimRuntimeDev.DEV;

export enum OsimRuntimeStatus {
  INIT,
  READY,
  ERROR,
}

let status = ref(OsimRuntimeStatus.INIT);
export const osimRuntimeStatus = computed<OsimRuntimeStatus>(() => {
  return status.value;
});

const OsimRuntime = z.object({
  backends: z.object({
    osidb: z.string(),
  }),
  osimVersion: z.string(),
  error: z.string().default(''),
})
type OsimRuntime = z.infer<typeof OsimRuntime>;

let runtime = ref<OsimRuntime>({
  backends: {osidb: ''},
  osimVersion: '',
  error: '',
});
export const osimRuntime = computed<OsimRuntime>(() => {
  return runtime.value;
});

let setupCallCount = 0;

export function setup() {
  if (setupCallCount > 0) {
    console.warn('osimRuntime.setup called more than once:', setupCallCount + 1);
  }
  setupCallCount++;

  return fetch('/runtime.json')
      .then(response => response.json())
      .then((json: OsimRuntime) => {
        console.debug('OsimRuntime', json);
        try {
          runtime.value = OsimRuntime.parse(json);
          status.value = OsimRuntimeStatus.READY;
        } catch (e) {
          console.error('Unable to parse OsimRuntime', e);
          runtime.value.error = 'Backends are not correctly configured. Please try again later.';
          status.value = OsimRuntimeStatus.ERROR;
        }
      })
      .catch(e => {
        console.error('Unable to get backends', e);
        runtime.value.error = 'Error finding backends. Possible deployment misconfiguration. Please try again.';
        status.value = OsimRuntimeStatus.ERROR;
      });
}
