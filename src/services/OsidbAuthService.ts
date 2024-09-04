import { z } from 'zod';
import { osimRuntime } from '@/stores/osimRuntime';
import { useUserStore } from '../stores/UserStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';

const RefreshResponse = z.object({
  access: z.string(),
});

export type OsidbFetchCallbacks = {
  beforeFetch?: (options: OsidbFetchOptions) => Promise<void> | void;
  // afterFetch?: (response: Response) => Promise<void> | void;
};

export type OsidbGetFetchOptions = {
  url: string;
  method: 'GET' | 'get';
  params?: Record<string, any>;
  data?: never;
};

export type OsidbPutPostFetchOptions = {
  url: string;
  method: 'POST' | 'PUT' | 'post' | 'put';
  data?: Record<string, any>;
  params?: Record<string, any>;
};

export type OsidbDeleteFetchOptions = {
  url: string;
  method: 'DELETE' | 'delete';
  data?: Record<string, any> | string[] | Record<string, any>[];
  params?: never;
};

export type OsidbFetchOptions =
  | OsidbGetFetchOptions
  | OsidbPutPostFetchOptions
  | OsidbDeleteFetchOptions;

export async function osidbFetch(config: OsidbFetchOptions, factoryOptions?: OsidbFetchCallbacks) {

  if (factoryOptions?.beforeFetch) {
    await factoryOptions.beforeFetch(config);
  }

  const body = config?.data ? JSON.stringify(config.data) : undefined;
  const queryString = queryStringFromParams(config?.params ?? {});
  const baseUrl = osimRuntime.value.backends.osidb;

  if (config?.method?.toUpperCase() !== 'GET' && osimRuntime.value.readOnly) {
    useToastStore().addToast({ title: 'Operation Not Permitted', body: 'OSIM is in read-only mode.' });
    return Promise.reject('OSIM is in read-only mode.');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${config.url}${queryString}`, {
      method: config?.method ?? 'GET',
      headers: await osimRequestHeaders(),
      mode: 'cors',
      credentials: 'include',
      body,
    });
  } catch (e) {
    return Promise.reject(e);
  }

  if (!response.ok) {
    let data;
    if (response.headers.get('content-type')?.startsWith('text/html')) {
      data = await response.text();
    } else {
      data = await response.json();
    }

    return Promise.reject({
      response: {
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        redirected: response.redirected,
        status: response.status,
        statusText: response.statusText,
        type: response.type,
        url: response.url,
        data,
      },
      data,
    });
  }

  return { data: await response.json(), response };
}

async function osimRequestHeaders() {
  const settingsStore = useSettingsStore();
  const token = await getNextAccessToken();
  return new Headers({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Bugzilla-Api-Key': settingsStore.settings.bugzillaApiKey,
    'Jira-Api-Key': settingsStore.settings.jiraApiKey,
  });
}

function paramsFrom(params: Record<string, any>) {
  const urlParams = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined) {
      urlParams.set(key, params[key]);
    }
  }
  return urlParams;
}

function queryStringFromParams(params: Record<string, any>) {
  const urlParams = paramsFrom(params);
  const queryString = urlParams.toString();
  return queryString ? `?${queryString}` : '';
}

export async function getNextAccessToken() {
  // Moving this to module scope results in "cannot access before initialization" -
  // probably a vite or typescript bug
  const url = `${osimRuntime.value.backends.osidb}/auth/token/refresh`;
  const userStore = useUserStore();
  let response;
  if (userStore.accessToken && !userStore.isAccessTokenExpired()) {
    return userStore.accessToken;
  }
  try {
    const fetchResponse = await fetch(url, {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        refresh: userStore.refresh,
      }),
    });
    response = await fetchResponse.json();
  } catch (e) {
    return userStore.logout()
      .finally(() => {
        throw new Error('Refresh token expired');
      });
  }
  try {
    const responseBody = response;
    const parsedBody = RefreshResponse.parse(responseBody);
    userStore.accessToken = parsedBody.access;
    return parsedBody.access;
  } catch (e) {
    console.error('OsidbAuthService::getNextAccessToken() Error getting access token', e);
    return userStore.logout()
      .finally(() => {
        throw new Error('Unable to parse next access token');
      });
  }
}
