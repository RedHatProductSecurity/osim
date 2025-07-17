import { z } from 'zod';

import { osimRuntime } from '@/stores/osimRuntime';
import { useToastStore } from '@/stores/ToastStore';

import { useUserStore } from '../stores/UserStore';

const RefreshResponse = z.object({
  access: z.string(),
});

export type OsidbFetchCallbacks = {
  beforeFetch?: (options: OsidbFetchOptions) => Promise<void> | void;
  // afterFetch?: (response: Response) => Promise<void> | void;
};

type CacheOptions = 'default' | 'force-cache' | 'no-cache' | 'only-if-cached' | 'reload';

export type OsidbGetFetchOptions = {
  cache?: CacheOptions;
  data?: never;
  method: 'GET' | 'get';
  params?: Record<string, any>;
  url: string;
};

export type OsidbPatchPutPostFetchOptions = {
  cache?: CacheOptions;
  data?: Record<string, any>;
  method: 'PATCH' | 'patch' | 'POST' | 'post' | 'PUT' | 'put';
  params?: Record<string, any>;
  url: string;
};

export type OsidbDeleteFetchOptions = {
  cache?: never;
  data?: Record<string, any> | Record<string, any>[] | string[];
  method: 'DELETE' | 'delete';
  params?: never;
  url: string;
};

export type OsidbFetchOptions =
  | OsidbDeleteFetchOptions
  | OsidbGetFetchOptions
  | OsidbPatchPutPostFetchOptions;

export async function osidbFetch(config: OsidbFetchOptions, factoryOptions?: OsidbFetchCallbacks) {
  if (factoryOptions?.beforeFetch) {
    await factoryOptions.beforeFetch(config);
  }

  const body = config?.data ? JSON.stringify(config.data) : undefined;
  const queryString = queryStringFromParams(config?.params ?? {});
  const baseUrl = osimRuntime.value.backends.osidb;

  // Debug logging
  console.log('🔍 osidbFetch called with:', {
    method: config?.method,
    url: `${baseUrl}${config.url}${queryString}`,
    hasData: !!config?.data,
    data: config?.data,
    bodyString: body,
    headers: await osimRequestHeaders(),
  });

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
      cache: config?.cache,
      body,
    });

    console.log('📡 Fetch response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (e) {
    console.error('❌ Fetch failed:', e);
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

  if (response.status === 204) {
    return { response, data: undefined };
  }

  return { data: await response.json(), response };
}

async function osimRequestHeaders() {
  const token = await getNextAccessToken();
  return new Headers({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
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
