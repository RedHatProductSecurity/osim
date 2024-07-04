import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import { getNextAccessToken } from '@/services/OsidbAuthService';
import {
  osimRuntime,
} from '@/stores/osimRuntime';
import type { ZodJiraUserPickerType, ZodJiraIssueType } from '@/types/zodJira';

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
  params?: Record<string, any>;
};

type JiraFetchOptions =
  | JiraGetFetchOptions
  | JiraPutPostFetchOptions

async function jiraFetch<T = any>(config: JiraFetchOptions, factoryOptions?: JiraFetchCallbacks) {

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

  if (response.status === 204) {
    return { data: undefined, response };
  }
  return { data: await response.json() as T, response };
}

export async function getJiraComments(taskId: string) {
  return jiraFetch({
    method: 'get',
    url: `/rest/api/2/issue/${taskId}/comment`,
  });
}

export async function searchJiraUsers(query: string) {
  return jiraFetch<{ users: ZodJiraUserPickerType[] }>({
    method: 'get',
    url: '/rest/api/2/user/picker',
    params: { query },
  });
}

export async function getJiraIssue(taskId: string) {
  return jiraFetch<ZodJiraIssueType>({
    method: 'get',
    url: `/rest/api/2/issue/${taskId}`,
  });
}

type putIssueOptions<T, U> = {
  params?: {
    notifyUsers?: boolean;
    returnIssue?: boolean;
  },
  data: {
    fields?: keyof T extends keyof U ? never : T;
    update?: keyof U extends keyof T ? never : U;
  }
}

type putIssueUpdate = Record<string, Array<{
  [K in 'set' | 'add' | 'remove' | 'edit' | 'copy']?: any;
}>>

export async function putJiraIssue<T extends object | undefined,
  U extends putIssueUpdate | undefined>(taskId: string, opts: putIssueOptions<T, U>) {
  return jiraFetch({
    method: 'put',
    url: `/rest/api/2/issue/${taskId}`,
    ...opts
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

export async function getJiraUsername() {
  return jiraFetch({
    method: 'get',
    url: '/rest/api/2/myself',
  }).then((res) => {
    if (res.response.ok) {
      return res.data.name;
    }
  }).catch(() => {
    useToastStore().addToast({
      'title': 'Jira Error',
      'body': `Error getting your username from <a href="${osimRuntime.value.backends.jiraDisplay}">Jira</a>. ` +
      'Is your Jira Access Token valid?',
      'bodyHtml': true,
      'css': 'warning',
    });
    return '';
  });
}

async function osimRequestHeaders() {
  const settingsStore = useSettingsStore();
  const osidbToken = await getNextAccessToken();
  if (osimRuntime.value.env === 'prod') {
    return new Headers({
      'Authorization': `Bearer ${settingsStore.settings.jiraApiKey}`,
      'Content-Type': 'application/json',
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
