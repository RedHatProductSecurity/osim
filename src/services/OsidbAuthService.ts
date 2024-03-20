import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { osimRuntime } from '@/stores/osimRuntime';
import { useUserStore } from '../stores/UserStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';

const RefreshResponse = z.object({
  access: z.string(),
});

export async function osidbFetch(config: AxiosRequestConfig) {
  if (osimRuntime.value.readOnly && config.method?.toLowerCase() !== 'get') {
    useToastStore().addToast({
      title: 'Operation Not Permitted',
      body: 'Operation prevented since OSIM is in read-only mode',
      css: 'danger',
    });
    return Promise.reject(new Error('OSIM is in read-only mode'));
  }
  const settingsStore = useSettingsStore();
  const accessToken = await getNextAccessToken();
  config.headers = config.headers || {};
  config.headers['Authorization'] = `Bearer ${accessToken}`;
  if (/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')) {
    config.headers['Bugzilla-Api-Key'] = settingsStore.settings.bugzillaApiKey;
  }
  if (/.+/.test(settingsStore.settings.jiraApiKey ?? '')) {
    config.headers['Jira-Api-Key'] = settingsStore.settings.jiraApiKey; // Source: osidb/openapi.yml
  }
  config.baseURL = osimRuntime.value.backends.osidb;
  config.withCredentials = true;
  return axios(config);
}

export async function getNextAccessToken() {
  // Moving this to module scope results in "cannot access before initialization" -
  // probably a vite or typescript bug
  const userStore = useUserStore();
  let response;
  try {
    response = await axios({
      method: 'post',
      url: '/auth/token/refresh',
      baseURL: osimRuntime.value.backends.osidb,
      withCredentials: true,
      data: {
        refresh: userStore.refresh,
      },
      // headers: {
      //   'Authorization': `Bearer`
      // },
    });
  } catch (e) {
    return userStore.logout()
      .finally(() => {
        throw new Error('Refresh token expired');
      });
  }
  try {
    const responseBody = response.data;
    const parsedBody = RefreshResponse.parse(responseBody);
    return parsedBody.access;
  } catch (e) {
    return userStore.logout()
      .finally(() => {
        throw new Error('Unable to parse next access token');
      });
  }
}

export function getDisplayedOsidbError(error: AxiosError<any, any>) {
  if (error.response) {
    if (error.response.headers['content-type']?.startsWith('text/html')) {
      // server in debug mode?
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        error.response.data, error.response.headers['content-type']
      );
      const exception_value = doc.querySelector('.exception_value');
      const text = (exception_value as HTMLElement)?.innerText;
      return 'Likely error between OSIDB and database:\n' + text;
    } else {
      return `Code ${error.response.status}: ` +
      `${
        error.response.data instanceof Object ?
          JSON.stringify(error.response.data, null, 2) :
          error.response.data
      }`;
    }
  } else if (error.request) {
    return error.request.toString(); // XMLHttpRequest object
  }
  return error.toString();
}
