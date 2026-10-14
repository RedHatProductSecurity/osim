import { createSuccessHandler, createCatchHandler } from '@/composables/service-helpers';

import { useUserStore } from '@/stores/UserStore';
import { useToastStore } from '@/stores/ToastStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import {
  osimRuntime,
} from '@/stores/osimRuntime';
import type { ZodJiraUserAssignableType, ZodJiraIssueType } from '@/types/zodJira';
import { jiraMarkupToAdf } from '@/utils/jiraAdf';

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
      headers: getJiraCloudAuthHeaders(),
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
    url: `/rest/api/3/issue/${taskId}/comment`,
    params: { expand: 'renderedBody' },
  });
}

export async function getJiraUser(accountId: string) {
  return jiraFetch<{ accountId: string; displayName: string }>({
    method: 'get',
    url: '/rest/api/3/user',
    params: { accountId },
  }).then(res => res.data).catch(() => null);
}

export async function searchJiraUsers(query: string, issueKey: string) {
  return jiraFetch<ZodJiraUserAssignableType[]>({
    method: 'get',
    url: '/rest/api/3/user/assignable/search',
    params: { issueKey, query },
  });
}

export async function getJiraIssue(taskId: string) {
  return jiraFetch<ZodJiraIssueType>({
    method: 'get',
    url: `/rest/api/3/issue/${taskId}`,
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
    url: `/rest/api/3/issue/${taskId}`,
    ...opts,
  });
}

export async function postJiraComment(taskId: string, comment: string) {
  return jiraFetch({
    method: 'post',
    url: `/rest/api/3/issue/${taskId}/comment`,
    data: {
      body: jiraMarkupToAdf(comment),
    },
  })
    .then(createSuccessHandler({ title: 'Success!', body: 'Internal comment saved' }))
    .then(response => response.data)
    .catch(createCatchHandler('Error saving internal Jira comment'));
}

export type JiraTransitionField = {
  allowedValues?: Array<{ id: string; name?: string; value?: string }>;
  name: string;
  operations?: string[];
  required: boolean;
};

export type JiraTransition = {
  fields?: Record<string, JiraTransitionField>;
  id: string;
  name: string;
  to: { name: string };
};

export type JiraCloseChoice = {
  comment?: string;
  resolution: string;
  vexJustification?: string;
};

export async function getJiraTransitions(issueKey: string) {
  return jiraFetch<{ transitions: JiraTransition[] }>({
    method: 'get',
    url: `/rest/api/3/issue/${issueKey}/transitions`,
    params: { expand: 'transitions.fields' },
  });
}

export function getCloseTransition(transitions: JiraTransition[]) {
  return transitions.find(t => t.to?.name === 'Closed');
}

export async function postJiraTransition(issueKey: string, transition: JiraTransition, choice: JiraCloseChoice) {
  const resolution = transition.fields?.resolution;
  const vexField = Object.entries(transition.fields ?? {}).find(([, field]) => field.name === 'VEX Justification');
  if (transition.to?.name !== 'Closed' || !resolution?.allowedValues?.some(v => v.id === choice.resolution)
    || !resolution.operations?.includes('set')) {
    throw new Error(`No valid close resolution for ${issueKey}`);
  }
  if (choice.vexJustification && (!vexField?.[1].allowedValues?.some(v => v.id === choice.vexJustification)
    || !vexField[1].operations?.includes('set'))) {
    throw new Error(`Invalid VEX justification for ${issueKey}`);
  }
  if (vexField?.[1].required && !choice.vexJustification) {
    throw new Error(`VEX justification required for ${issueKey}`);
  }
  return jiraFetch({
    method: 'post',
    url: `/rest/api/3/issue/${issueKey}/transitions`,
    data: {
      transition: { id: transition.id },
      fields: {
        resolution: { id: choice.resolution },
        ...(choice.vexJustification && vexField ? { [vexField[0]]: { id: choice.vexJustification } } : {}),
      },
      ...(choice.comment?.trim()
        ? {
            update: { comment: [{ add: { body: jiraMarkupToAdf(choice.comment.trim()) } }] },
          }
        : {}),
    },
  });
}

export async function closeJiraIssue(issueKey: string, transition: JiraTransition, choice: JiraCloseChoice) {
  return postJiraTransition(issueKey, transition, choice);
}

export async function getJiraUsername() {
  return jiraFetch({
    method: 'get',
    url: '/rest/api/3/myself',
  }).then((res) => {
    if (res.response.ok) {
      return res.data.displayName || res.data.name || res.data.accountId || res.data.emailAddress;
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

function getJiraCloudAuthHeaders(): Headers {
  const userEmail = useUserStore().userEmail;
  const jiraApiToken = useSettingsStore().apiKeys.jiraApiKey;

  if (userEmail && jiraApiToken) {
    return new Headers({
      'Authorization': `Basic ${btoa(`${userEmail}:${jiraApiToken}`)}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OSIM',
    });
  }
  throw new Error('Jira Authentication Failed:Invalid user email or API token');
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

export function jiraUserUrl(accountId: string): string {
  return (new URL(`/jira/people/${accountId}`, osimRuntime.value.backends.jiraDisplay)).href;
}
