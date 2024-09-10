import { createSuccessHandler, createCatchHandler } from '@/composables/service-helpers';

import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import { getNextAccessToken } from '@/services/OsidbAuthService';
import {
  osimRuntime,
} from '@/stores/osimRuntime';
import type { ZodJiraUserAssignableType, ZodJiraIssueType } from '@/types/zodJira';

type JiraFetchCallbacks = {
  beforeFetch?: (options: JiraFetchOptions) => Promise<void> | void;
};

type JiraGetFetchOptions = {
  data?: never;
  method: 'GET' | 'get';
  params?: Record<string, any>;
  url: string;
};

type JiraPutPostFetchOptions = {
  data?: Record<string, any>;
  method: 'POST' | 'post' | 'PUT' | 'put';
  params?: Record<string, any>;
  url: string;
};

type JiraFetchOptions =
  | JiraGetFetchOptions
  | JiraPutPostFetchOptions;

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

export async function searchJiraUsers(query: string, issueKey: string) {
  return jiraFetch<{ users: ZodJiraUserAssignableType[] }>({
    method: 'get',
    url: '/rest/internal/2/users/assignee',
    params: { issueKey, query },
  });
}

export async function getJiraIssue(taskId: string) {
  return jiraFetch<ZodJiraIssueType>({
    method: 'get',
    url: `/rest/api/2/issue/${taskId}`,
  });
}

type putIssueOptions<T, U> = {
  data: {
    fields?: keyof T extends keyof U ? never : T;
    update?: keyof U extends keyof T ? never : U;
  };
  params?: {
    notifyUsers?: boolean;
    returnIssue?: boolean;
  };
};

type putIssueUpdate = Record<string, Array<{
  [_ in 'add' | 'copy' | 'edit' | 'remove' | 'set']?: any;
}>>;

export async function putJiraIssue<T extends object | undefined,
  U extends putIssueUpdate | undefined>(taskId: string, opts: putIssueOptions<T, U>) {
  return jiraFetch({
    method: 'put',
    url: `/rest/api/2/issue/${taskId}`,
    ...opts,
  });
}

export async function postJiraComment(taskId: string, comment: string) {
  return jiraFetch({
    method: 'post',
    url: `/rest/api/2/issue/${taskId}/comment`,
    data: {
      body: comment,
    },
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Internal comment saved' }))
    .then(response => response.data)
    .catch(createCatchHandler('Error saving internal Jira comment'));
}

export async function getJiraUsername() {
  return jiraFetch({
    method: 'get',
    url: '/rest/api/2/myself',
  }).then((res) => {
    if (res.response.ok) {
      return res.data.name;
    }
  }).catch((error) => {
    console.error('JiraService::getJiraUsername() Error getting your username from jira', error);
    useToastStore().addToast({
      title: 'Jira Error',
      body: `Error getting your username from <a href="${osimRuntime.value.backends.jiraDisplay}">Jira</a>. ` +
      'Is your Jira Access Token valid?',
      bodyHtml: true,
      css: 'warning',
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

export function jiraTaskUrl(id: string): string {
  return (new URL(`/browse/${id}`, osimRuntime.value.backends.jiraDisplay)).href;
}

export function jiraUserUrl(name: string): string {
  return (new URL(`/ViewProfile.jspa?name=${name}`, osimRuntime.value.backends.jiraDisplay)).href;
}
