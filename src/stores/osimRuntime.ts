// No need to use Pinia; these values are set on app startup and never changed.
// Named with camelCase instead of PascalCase to differentiate from Pinia stores.

import { computed, ref } from 'vue';
import { z } from 'zod';

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

const status = ref(OsimRuntimeStatus.INIT);
export const osimLastBuildDateTime = ref('');
export const osimRuntimeStatus = computed<OsimRuntimeStatus>(() => {
  return status.value;
});

const OsimRuntime = z.object({
  backends: z.object({
    osidb: z.string(),
    osidbAuth: z.string().default('kerberos'),
    bugzilla: z.string(),
  }),
  osimVersion: z.string(),
  error: z.string().default(''),
});
type OsimRuntime = z.infer<typeof OsimRuntime>;

const runtime = ref<OsimRuntime>({
  backends: {
    osidb: '',
    osidbAuth: '',
    bugzilla: ''
  },
  osimVersion: '',
  error: '',
});
export const osimRuntime = computed<OsimRuntime>(() => {
  return runtime.value;
});

const OsidbHealthy = z.object({
  env: z.string(),
  revision: z.string(),
  version: z.string(),
});
type OsidbHealthy = z.infer<typeof OsidbHealthy>;
const _osidbHealth = ref<OsidbHealthy>({
  env: '',
  revision: '',
  version: '',
});
export const osidbHealth = computed<OsidbHealthy>(() => {
  return _osidbHealth.value;
});

let setupCallCount = 0;
export async function setup() {
  if (setupCallCount > 0) {
    console.warn('osimRuntime.setup called more than once:', setupCallCount + 1);
  }
  setupCallCount++;
  await fetchOsimLastBuildDateTime();
  return fetchRuntime()
    .then(fetchOsidbHealthy)
    .then(() => {
      // If an error was not set, then the status is still INIT.
      // If the status is still INIT after all the initialization, then set the status to READY.
      if (status.value === OsimRuntimeStatus.INIT) {
        status.value = OsimRuntimeStatus.READY;
      }
    });
}

async function fetchOsimLastBuildDateTime() {
  return fetch('/last-build-time.json', {
    method: 'GET',
    cache: 'no-cache',
  }).then((response) => response.json()).then((json) => {
    console.debug('Version', json);
    osimLastBuildDateTime.value = json.osimLastBuildTime;
  }).catch(console.error);
}

function fetchRuntime() {
  return fetch('/runtime.json', {
    method: 'GET',
    cache: 'no-cache',
  })
    .then((response) => response.json())
    .then((json: OsimRuntime) => {
      console.debug('OsimRuntime', json);
      try {
        runtime.value = OsimRuntime.parse(json);
      } catch (e) {
        console.error('Unable to parse OsimRuntime', e);
        runtime.value.error = 'Backends are not correctly configured. Please try again later.';
        status.value = OsimRuntimeStatus.ERROR;
      }
    })
    .catch((e) => {
      console.error('Unable to get backends', e);
      runtime.value.error =
        'Error finding backends. ' +
        'Possible deployment misconfiguration. Please try again.';
      status.value = OsimRuntimeStatus.ERROR;
    });
}

function fetchOsidbHealthy() {
  return fetch(`${runtime.value.backends.osidb}/osidb/healthy`, {
    method: 'GET',
    cache: 'no-cache',
  })
    .then((response) => response.json())
    .then((json: OsidbHealthy) => {
      console.debug('OsidbHealthy', json);
      try {
        _osidbHealth.value = OsidbHealthy.parse(json);
      } catch (e) {
        console.error('Unable to parse OSIDB health', e);
        runtime.value.error = 'Unexpected response from OSIDB. Please try again later.';
        status.value = OsimRuntimeStatus.ERROR;
      }
    })
    .catch((e) => {
      console.error('Unable to get OSIDB health', e);
      runtime.value.error =
        'Error getting OSIDB health. ' +
        'Possible deployment misconfiguration. Please try again.';
      status.value = OsimRuntimeStatus.ERROR;
    });
}
