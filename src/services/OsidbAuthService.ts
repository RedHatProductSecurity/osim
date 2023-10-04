import axios, {type AxiosError} from 'axios';
import {z} from 'zod';
import type {AxiosRequestConfig} from 'axios';
import {osimRuntime} from '@/stores/osimRuntime';
import {useUserStore} from '../stores/UserStore';
import {useSettingsStore} from '@/stores/SettingsStore';

const RefreshResponse = z.object({
  access: z.string()
});

export async function osidbFetch(config: AxiosRequestConfig) {
  const settingsStore = useSettingsStore();
  try {
    const accessToken = await getNextAccessToken();
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${accessToken}`;
    if (/.+/.test(settingsStore.settings.bugzillaApiKey ?? '')) {
      config.headers['Bugzilla-Api-Key'] = settingsStore.settings.bugzillaApiKey;
    }
    config.baseURL = osimRuntime.value.backends.osidb;
    config.withCredentials = true;
    return axios(config);
  } catch (e) {
    throw e;
  }
}

export async function getNextAccessToken() {
  const userStore = useUserStore(); // Moving this to module scope results in "cannot access before initialization" - probably a vite or typescript bug
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
        })
  }
  try {
    const responseBody = response.data;
    const parsedBody = RefreshResponse.parse(responseBody);
    return parsedBody.access;
  } catch (e) {
    return userStore.logout()
        .finally(() => {
          throw new Error('Unable to parse next access token');
        })
  }
}

export function getDisplayedOsidbError(error: AxiosError<any, any>) {
  if (error.response) {
    if (error.response.headers['content-type']?.startsWith('text/html')) {
      // server in debug mode?
      const parser = new DOMParser();
      const doc = parser.parseFromString(error.response.data, error.response.headers['content-type']);
      const exception_value = doc.querySelector('.exception_value');
      const text = (exception_value as HTMLElement)?.innerText;
      return text;
    } else {
      return `Code ${error.response.status}: ${error.response.data instanceof Object ? JSON.stringify(error.response.data, null, 2) : error.response.data}`;
    }
  } else if (error.request) {
    return error.request.toString(); // XMLHttpRequest object
  }
  return error.toString();
}
