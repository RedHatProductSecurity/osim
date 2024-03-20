//    <div class="alert alert-danger"
//          role="alert"
//         v-if="!/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')">
//       You have not set your Bugzilla API key in this tab!<br/>
//       Flaw creation requires your Bugzilla API key to be set.<br/>
//       Visit <RouterLink :to="{name: 'settings'}">Settings</RouterLink>.
//     </div>

import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
// import { useRouter } from 'vue-router';

export function notifyApiKeyUnset() {

  const { settings: { bugzillaApiKey, jiraApiKey } } = useSettingsStore();
  const unsetKeys: string[] = [];

  if (!bugzillaApiKey) {
    unsetKeys.push('Bugzilla');
  }

  if (!jiraApiKey) {
    unsetKeys.push('JIRA');
  }

  if (!bugzillaApiKey || !jiraApiKey) {
    const { addToast } = useToastStore();
    const lis = unsetKeys.map((key) => `<li>${key}</li>`).join('');

    addToast({
      css: 'warning',
      title: 'Read-Only Mode',
      bodyHtml: true,
      body: `You have not set the following keys in this tab: <ul>${lis}</ul>` +
      'Flaw creation requires your Bugzilla API or JIRA key to be set. ' +
      'Visit Settings to set any required keys.'
    });
    // maybeRedirectToSettings();
  }
}

// function maybeRedirectToSettings () {
//   const router = useRouter();
//   if (router.currentRoute.value.fullPath === '/flaws/new') {
//     router.push({path: '/settings'});
//   }
// }

