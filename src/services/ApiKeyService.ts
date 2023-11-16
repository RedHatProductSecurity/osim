//    <div class="alert alert-danger"
//          role="alert"
//         v-if="!/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')">
//       You have not set your Bugzilla API key in this tab!<br/>
//       Flaw creation requires your Bugzilla API key to be set.<br/>
//       Visit <RouterLink :to="{name: 'settings'}">Settings</RouterLink>.
//     </div>

import {useSettingsStore} from '@/stores/SettingsStore';
import {useToastStore} from '@/stores/ToastStore';

const {addToast} = useToastStore();
const settingsStore = useSettingsStore();


export function notifyApiKeyUnset() {
  if (!/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')) {
    addToast({
      css: 'warning',
      title: 'Request CVE',
      bodyHtml: true,
      body: 'You have not set your Bugzilla API key in this tab!<br/>Flaw editing requires your Bugzilla API key to be set.<br/>Visit <RouterLink :to="{name: \'settings\'}">Settings</RouterLink>',
    });
  }
}
