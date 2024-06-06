import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import { getNextAccessToken } from '@/services/OsidbAuthService';
import {
  osimRuntime,
} from '@/stores/osimRuntime';

type JiraFetchCallbacks = {
  beforeFetch?: (options: JiraFetchOptions) => Promise<void> | void;
};

type JiraGetFetchOptions = {
  url: string;
  method: 'GET' | 'get';
  params?: Record<string, any>;
  data?: never;
};

type JiraPutPostFetchOptions = {
  url: string;
  method: 'POST' | 'PUT' | 'post' | 'put';
  data?: Record<string, any>;
  params?: never;
};

type JiraFetchOptions =
  | JiraGetFetchOptions
  | JiraPutPostFetchOptions

async function jiraFetch(config: JiraFetchOptions, factoryOptions?: JiraFetchCallbacks) {

  if (factoryOptions?.beforeFetch) {
    await factoryOptions.beforeFetch(config);
  }

  const body = config?.data ? JSON.stringify(config.data) : undefined;
  const queryString = queryStringFromParams(config?.params ?? {});
  const baseUrl = osimRuntime.value.backends.jira;

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
    },
    );
  }

  return { data: await response.json(), response };
}

export async function getJiraComments(taskId: string) {
  return jiraFetch({
    method: 'get',
    url: `/rest/api/2/issue/${taskId}/comment`,
  });
}

export async function postJiraComment(taskId: string, comment: string) {
  return jiraFetch({
    method: 'post',
    url: `/rest/api/2/issue/${taskId}/comment`,
    data: {
      body: comment
    },
  }).then((response) => response.data);
}

async function osimRequestHeaders() {
  const settingsStore = useSettingsStore();
  const osidbToken = await getNextAccessToken();
  if (osimRuntime.value.env === 'prod') {
    return new Headers({
      'Authorization': `Bearer ${settingsStore.settings.jiraApiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OSIM',
    });
  } else {
    return new Headers({
      'Authorization': `Bearer ${osidbToken}`,
      'Content-Type': 'application/json',
      'Bugzilla-Api-Key': settingsStore.settings.bugzillaApiKey,
      'Jira-Api-Key': settingsStore.settings.jiraApiKey,
      'User-Agent': 'OSIM',
    });
  }
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

export function taskUrl(id: string): string {
  return (new URL(`/browse/${id}`, osimRuntime.value.backends.jiraDisplay)).href;
}
