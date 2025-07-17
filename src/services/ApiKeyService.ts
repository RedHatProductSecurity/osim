//    <div class="alert alert-danger"
//          role="alert"
//         v-if="!/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')">
//       You have not set your Bugzilla API key in this tab!<br/>
//       Flaw creation requires your Bugzilla API key to be set.<br/>
//       Visit <RouterLink :to="{name: 'settings'}">Settings</RouterLink>.
//     </div>

import { createCatchHandler } from '@/composables/service-helpers';

import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import { osidbFetch } from '@/services/OsidbAuthService';
// import { useRouter } from 'vue-router';

export interface IntegrationTokensResponse {
  bugzilla: null | string;
  jira: null | string;
}

export interface IntegrationTokensPatchRequest {
  bugzilla?: string;
  jira?: string;
}

export function notifyApiKeyUnset() {
  const settingsStore = useSettingsStore();
  const { bugzillaApiKey, jiraApiKey } = settingsStore.apiKeys;
  const unsetKeys: string[] = [];

  if (!bugzillaApiKey) {
    unsetKeys.push('Bugzilla');
  }

  if (!jiraApiKey) {
    unsetKeys.push('JIRA');
  }

  if (!bugzillaApiKey || !jiraApiKey) {
    const { addToast } = useToastStore();
    const lis = unsetKeys.map(key => `<li>${key}</li>`).join('');

    addToast({
      css: 'warning',
      title: 'Cannot Edit/Create Flaws',
      bodyHtml: true,
      body: `You have not set the following keys in this tab: <ul>${lis}</ul>` +
      'Flaw creation requires your Bugzilla API or JIRA key to be set. ' +
      'Visit Settings to set any required keys.',
    });
    // maybeRedirectToSettings();
  }
}

/**
 * Save API keys to the backend
 */
export async function saveApiKeysToBackend(apiKeys: IntegrationTokensPatchRequest) {
  console.log('ApiKeyService: saveApiKeysToBackend called with:', apiKeys);

  return osidbFetch({
    method: 'PATCH',
    url: '/osidb/integrations',
    data: apiKeys,
  })
    .catch(createCatchHandler('Failed to save API keys'));
}

/**
 * Retrieve API keys from the backend
 */
export async function getApiKeysFromBackend(): Promise<IntegrationTokensResponse> {
  try {
    const response = await osidbFetch({
      method: 'get',
      url: '/osidb/integrations',
    });
    return response.data as IntegrationTokensResponse;
  } catch (error) {
    console.error('Failed to retrieve API keys:', error);
    throw error;
  }
}

// function maybeRedirectToSettings () {
//   const router = useRouter();
//   if (router.currentRoute.value.fullPath === '/flaws/new') {
//     router.push({path: '/settings'});
//   }
// }
