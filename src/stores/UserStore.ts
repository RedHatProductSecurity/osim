import { computed } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';

import { osimRuntime } from '@/stores/osimRuntime';
import { getJiraUsername } from '@/services/JiraService';

function setEnv(value: string) {
  _userStoreSession.value.env = value;
}

export const queryRedirect = z.object({
  query: z.object({
    redirect: z.string(),
  }),
});

const _userStoreKey = 'UserStore';

// Migration: Remove deprecated 'refresh' token from localStorage for non-dev environments
// This can be removed in a future release after users have migrated
function migrateUserStore() {
  const rawStorage = localStorage.getItem(_userStoreKey);
  if (rawStorage) {
    try {
      const parsed = JSON.parse(rawStorage);
      if ('refresh' in parsed && osimRuntime.value?.env && osimRuntime.value.env !== 'dev') {
        console.debug('UserStore: Migrating localStorage - removing deprecated refresh token');
        delete parsed.refresh;
        localStorage.setItem(_userStoreKey, JSON.stringify(parsed));
      }
    } catch (e) {
      console.debug('UserStore: Migration skipped - unable to parse localStorage', e);
    }
  }
}

// Run migration before useLocalStorage initialization
migrateUserStore();

export const whoamiResponse = z.object({
  email: z.string(),
  groups: z.array(z.string()),
  profile: z.object({
    bz_user_id: z.string(),
    jira_user_id: z.string(),
  }).optional(),
  username: z.string(),
});
type WhoamiType = z.infer<typeof whoamiResponse>;

// Conditionally include refresh token in localStorage schema for dev environments
const userStoreLocalStorage = z.object({
  env: z.string(),
  refresh: z.string().optional(), // Only used in dev environments
  whoami: whoamiResponse.nullable(),
  jiraUsername: z.string(),
  isLoggedIn: z.boolean(),
});
export type UserStoreLocalStorage = z.infer<typeof userStoreLocalStorage>;

const _userStoreSession = useLocalStorage(
  _userStoreKey, { env: '', whoami: null, jiraUsername: '', isLoggedIn: false } as UserStoreLocalStorage,
);

async function updateJiraUsername() {
  if (_userStoreSession.value.jiraUsername === '') {
    const name = await getJiraUsername();
    if (name) {
      _userStoreSession.value.jiraUsername = name;
    }
  }
}

function resetUserStore() {
  _userStoreSession.value.env = '';
  _userStoreSession.value.whoami = null;
  _userStoreSession.value.jiraUsername = '';
  delete _userStoreSession.value.refresh;
}

export const useUserStore = defineStore('UserStore', () => {
  const $reset = resetUserStore;

  const whoami = computed<null | WhoamiType>(() => {
    return _userStoreSession.value.whoami || null;
  });
  const userName = computed(() => {
    if (_userStoreSession.value.whoami != null) {
      return _userStoreSession.value.whoami.email ?? _userStoreSession.value.whoami.username;
    }
    return 'Current User';
  });
  const userEmail = computed(() => {
    return _userStoreSession.value.whoami?.email ?? '';
  });

  const env = computed<string>(() => {
    return _userStoreSession.value.env ?? '';
  });

  const jiraUsername = computed(() => {
    return _userStoreSession.value.jiraUsername ?? '';
  });

  function setWhoami(data: WhoamiType) {
    _userStoreSession.value.whoami = data;
  }

  // For compatibility, keep a lightweight reset used by AuthStore

  return {
    whoami,
    userName,
    userEmail,
    jiraUsername,
    updateJiraUsername,
    env,
    setEnv,
    setWhoami,
    $reset,
  };
});
