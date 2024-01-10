//    <div class="alert alert-danger"
//          role="alert"
//         v-if="!/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')">
//       You have not set your Bugzilla API key in this tab!<br/>
//       Flaw creation requires your Bugzilla API key to be set.<br/>
//       Visit <RouterLink :to="{name: 'settings'}">Settings</RouterLink>.
//     </div>

import {useSettingsStore} from '@/stores/SettingsStore';
import {useToastStore} from '@/stores/ToastStore';
import type { ToastNew } from "@/stores/ToastStore";

export function notifyApiKeyUnset() {
  const { addToast } = useToastStore();
  const settingsStore = useSettingsStore();
  const { bugzillaApiKey, jiraApiKey } = settingsStore.settings;

  const toastOptions: ToastNew = {
    css: "warning",
    title: "Request CVE",
    bodyHtml: true,
    body: "",
  };

  const isBugzillaApiKeyUnset = !/.+/.test(bugzillaApiKey ?? "");
  const isJiraApiKeyUnset = !/.+/.test(jiraApiKey ?? "");
  const unsetKeys: string[] = [];

  if (isBugzillaApiKeyUnset) {
    unsetKeys.push("Bugzilla");
  }
  if (isJiraApiKeyUnset) {
    unsetKeys.push("JIRA");
  }
  if (isBugzillaApiKeyUnset || isJiraApiKeyUnset) {
    const lis = unsetKeys.map((key) => `<li>${key}</li>`).join('');
    toastOptions.body += `You have not set the following keys in this tab: <ul>${lis}</ul>Flaw creation requires your Bugzilla API or JIRA key to be set. Visit <a href="/settings"}>Settings</a> to set any required keys.`;
    addToast(toastOptions);
  }
}
