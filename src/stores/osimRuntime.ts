// No need to use Pinia; these values are set on app startup and never changed.
// Named with camelCase instead of PascalCase to differentiate from Pinia stores.

import { readonly, ref } from 'vue';

import { OsidbHealthy, OsimRuntime, OsimRuntimeStatus,
  type OsidbHealthyType, type OsimRuntimeType } from '@/types/zodOsim';

const status = ref(OsimRuntimeStatus.INIT);
export const osimRuntimeStatus = readonly(status);

const runtime = ref<OsimRuntimeType>({
  env: 'dev',
  backends: {
    osidb: 'http://osidb-service:8000',
    osidbAuth: 'kerberos',
    bugzilla: 'http://bugzilla-service:8001',
    jira: 'http://jira-service:8002',
    errata: 'http://errata-service:8003',
    jiraDisplay: 'http://jira-service:8002',
    mitre: 'http://mitre-service:8004',
  },
  osimVersion: { rev: 'dev', tag: 'dev', timestamp: '1970-01-01T00:00:00Z' },
  error: 'error',
  readOnly: false,
});
export const osimRuntime = readonly(runtime);

const _osidbHealth = ref<OsidbHealthyType>({
  env: '',
  revision: '',
  version: '',
});
export const osidbHealth = readonly(_osidbHealth);

let setupCallCount = 0;
export async function configureBackends() {
  if (setupCallCount > 0) {
    console.warn('osimRuntime::configureBackends() called more than once:', setupCallCount + 1);
  }

  setupCallCount++;
  parseRuntime();
  await fetchOsidbHealthy();
  // If an error was not set, then the status is still INIT.
  // If the status is still INIT after all the initialization, then set the status to READY.
  if (status.value === OsimRuntimeStatus.INIT) {
    status.value = OsimRuntimeStatus.READY;
  }
}

async function fetchOsimVersionFallback() {
  const branch = osidbHealth.value.env === 'stage' ? 'integration' : 'main';
  return fetch(`https://api.github.com/repos/RedHatProductSecurity/osim/commits/${branch}`, {
    method: 'GET',
    cache: 'no-cache',
  })
    .then(response => response.json())
    .then((json) => {
      runtime.value.osimVersion.rev = json.sha.substring(0, 7);
      runtime.value.osimVersion.tag = '[fetched from Github]';
    })
    .catch(e => console.error('osimRuntime::fetchOsimVersionFallback() failed', e));
}

function parseRuntime() {
  if (!window.__osim_runtime) {
    console.error('osimRuntime::parseRuntime() Unable to get backends');
    runtime.value.error =
    'Error finding backends. ' +
    'Possible deployment misconfiguration. Please try again.';
    status.value = OsimRuntimeStatus.ERROR;
  }

  console.debug('OsimRuntime', window.__osim_runtime);
  try {
    runtime.value = OsimRuntime.parse(window.__osim_runtime);
  } catch (e) {
    console.error('osimRuntime::parseRuntime() Unable to parse OsimRuntime',
      e,
      OsimRuntime.safeParse(window.__osim_runtime).error?.issues.map(
        // Provides additional helpful context for zod parsing errors
        issue => issue.path.join('/') + ': ' + issue.message,
      ));
    runtime.value.error = 'Backends are not correctly configured. Please try again later.';
    status.value = OsimRuntimeStatus.ERROR;
  }

  if (runtime.value.osimVersion.timestamp === '1970-01-01T00:00:00Z'
    || runtime.value.osimVersion.timestamp === '1969-12-31T23:59:59Z') {
    // 0 unix timestamp (or -1 unix timestamp, for when `date` is a second off)
    runtime.value.osimVersion.timestamp = new Date().toISOString();
  }
  if (runtime.value.osimVersion.rev === '' && runtime.value.osimVersion.tag === '') {
    fetchOsimVersionFallback();
  }
}

function fetchOsidbHealthy() {
  return fetch(`${runtime.value.backends.osidb}/osidb/healthy`, {
    method: 'GET',
    cache: 'no-cache',
  })
    .then(response => response.json())
    .then((json: OsidbHealthyType) => {
      console.debug('OsidbHealthy', json);
      try {
        _osidbHealth.value = OsidbHealthy.parse(json);
      } catch (e) {
        console.error('osimRuntime::fetchOsidbHealthy() Unable to parse OSIDB health', e);
        runtime.value.error = 'Unexpected response from OSIDB. Please try again later.';
        status.value = OsimRuntimeStatus.ERROR;
      }
    })
    .catch((e) => {
      console.error('osimRuntime::fetchOsidbHealthy() Unable to get OSIDB health', e);
      runtime.value.error =
        'Error getting OSIDB health. ' +
        'Possible deployment misconfiguration. Please try again.';
      status.value = OsimRuntimeStatus.ERROR;
    });
}
