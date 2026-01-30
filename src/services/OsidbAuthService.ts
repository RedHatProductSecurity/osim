import { z } from 'zod';

import { osimRuntime } from '@/stores/osimRuntime';
import { useToastStore } from '@/stores/ToastStore';
import { useAuthStore } from '@/stores/AuthStore';

const RefreshResponse = z.object({
  access: z.string(),
  refresh: z.string().optional(), // For dev environments
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
  // TEMPORARY: Remove include_history from OSIDB requests to avoid performance issues (OSIDB-4769)
  const { include_history: _, ...paramsWithoutHistory } = config?.params ?? {};
  const queryString = queryStringFromParams(paramsWithoutHistory);
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
      cache: config?.cache,
      body,
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
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Dev mode: include API keys from localStorage to bypass OSIDB Vault lookups
  if (osimRuntime.value.env === 'dev') {
    try {
      const keys = JSON.parse(localStorage.getItem('OSIM::DEV-API-KEYS') || '{}');
      if (keys.bugzillaApiKey) headers['Bugzilla-Api-Key'] = keys.bugzillaApiKey;
      if (keys.jiraApiKey) headers['Jira-Api-Key'] = keys.jiraApiKey;
    } catch {
      // Ignore parse errors
    }
  }

  return new Headers(headers);
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

export async function getNextAccessToken(forceRefresh: boolean = false) {
  // Moving this to module scope results in "cannot access before initialization" -
  // probably a vite or typescript bug
  const url = `${osimRuntime.value.backends.osidb}/auth/token/refresh`;
  const authStore = useAuthStore();
  let response;
  if (!forceRefresh && authStore.accessToken && !authStore.isAccessTokenExpired()) {
    return authStore.accessToken;
  }

  try {
    if (osimRuntime.value.env === 'dev') {
      // For local development: Use POST with refresh token from localStorage
      const refreshToken = authStore.getDevRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available in localStorage for dev environment');
      }

      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
        credentials: 'include',
        cache: 'no-cache',
      });
    } else {
      // Non local development: Use GET with cookies
      response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache',
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    const parsedResponse = RefreshResponse.parse(responseData);

    // Update the access token in the store
    authStore.accessToken = parsedResponse.access;
    authStore.isLoggedIn = true;

    // For dev environments, update the refresh token if provided
    if (osimRuntime.value.env === 'dev' && parsedResponse.refresh) {
      authStore.setDevRefreshToken(parsedResponse.refresh);
    }

    return parsedResponse.access;
  } catch (e) {
    console.error('OsidbAuthService::getNextAccessToken() Error refreshing access token', e);
    return authStore.logout()
      .finally(() => {
        throw new Error('Unable to refresh access token');
      });
  }
}
