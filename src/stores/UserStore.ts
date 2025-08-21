import { computed, ref, watch } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import jwtDecode from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';
import { useLocalStorage } from '@vueuse/core';
import { DateTime } from 'luxon';

// const router = useRouter();
import router from '@/router';
import { osimRuntime } from '@/stores/osimRuntime';
import { getJiraUsername } from '@/services/JiraService';

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

const loginResponse = z.object({
  access: z.string(),
  refresh: z.string().optional(), // Include refresh token for dev environments
  env: z.string(),
  detail: z.string().optional(), // detail error message
});
const whoamiResponse = z.object({
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

export const useUserStore = defineStore('UserStore', () => {
  const accessToken = ref<null | string>();
  const refreshToken = ref<null | string>();

  function setRefreshToken(env_: string, refresh_?: string) {
    _userStoreSession.value.env = env_;
    // Only store refresh token in localStorage for dev environments
    if (osimRuntime.value.env === 'dev' && refresh_) {
      _userStoreSession.value.refresh = refresh_;
      refreshToken.value = null; // Clear in-memory token for dev
    } else {
      delete _userStoreSession.value.refresh;
      refreshToken.value = refresh_ || null;
    }
  }

  function $reset() {
    _userStoreSession.value.env = '';
    _userStoreSession.value.whoami = null;
    _userStoreSession.value.jiraUsername = '';
    delete _userStoreSession.value.refresh;
    refreshToken.value = null;
  }

  const isAccessTokenExpired = () => {
    try {
      const exp = accessToken.value ? jwtDecode<JwtPayload>(accessToken.value)?.exp : null;
      return !exp || DateTime.now().toSeconds() >= exp - 60;
    } catch (e) {
      console.debug('UserStore: access token not a valid JWT', accessToken.value, e);
      return true;
    }
  };

  const whoami = computed<null | WhoamiType>(() => {
    return _userStoreSession.value.whoami || null;
  });
  const userName = computed(() => {
    if (!accessToken.value) {
      return 'Not Logged In';
    }
    if (_userStoreSession.value.whoami != null) {
      return _userStoreSession.value.whoami.email ?? _userStoreSession.value.whoami.username;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(accessToken.value);
      return decoded.sub ?? 'Current User';
    } catch (e) {
      return 'Current User';
    }
  });
  const userEmail = computed(() => {
    if (!accessToken.value) {
      return '';
    }
    return _userStoreSession.value.whoami?.email ?? '';
  });

  const env = computed<string>(() => {
    return _userStoreSession.value.env ?? '';
  });

  const jiraUsername = computed(() => {
    return _userStoreSession.value.jiraUsername ?? '';
  });

  async function login(username: string = '', password: string = '') {
    const requestMetadata: { [key: string]: any } = {};
    if (osimRuntime.value.backends.osidbAuth == 'kerberos') {
      requestMetadata['method'] = 'GET';
    } else if (osimRuntime.value.backends.osidbAuth == 'credentials') {
      requestMetadata['method'] = 'POST';
      requestMetadata['body'] = JSON.stringify({ username: username, password: password });
      requestMetadata['headers'] = {
        'Content-Type': 'application/json',
      };
    }

    return fetch(`${osimRuntime.value.backends.osidb}/auth/token`, {
      // credentials: 'same-origin',
      credentials: 'include',
      cache: 'no-cache',
      ...requestMetadata,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          // console.log('UserStore: login not ok', response.status, text);
          throw new Error(text);
        }
        const json = await response.json();
        const parsedLoginResponse = loginResponse.passthrough().parse(json);
        if (parsedLoginResponse.detail) {
          throw new Error(parsedLoginResponse.detail);
        }
        setRefreshToken(parsedLoginResponse.env, parsedLoginResponse.refresh);
        accessToken.value = parsedLoginResponse.access;
        _userStoreSession.value.isLoggedIn = true;
        return parsedLoginResponse.access;
      })
      .then((access) => {
        return fetch(`${osimRuntime.value.backends.osidb}/osidb/whoami`, {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            Authorization: `Bearer ${access}`,
          },
        });
      })
      .then(response => response.json())
      .then((json) => {
        const parsedWhoamiResponse = whoamiResponse.parse(json);
        _userStoreSession.value.whoami = parsedWhoamiResponse;
      })
      .then(async () => {
        await updateJiraUsername();
      })
      .catch((e) => {
        $reset();
        console.error('UserStore::login() unsuccessful login request', e);
        throw e;
      });
  }

  function logout() {
    // clearInterval(refreshInterval);
    $reset();
    accessToken.value = null;
    _userStoreSession.value.isLoggedIn = false;

    // router.push({name: 'login'});
    // return Promise.resolve()
    //     .then(() => {
    //       jwt.value.user = undefined;
    //     })
    //     .then(() => {
    //       router.push({name: 'login'})
    //     })
    return router.push({ name: 'login' });
  }

  const isAuthenticated = computed<boolean>(() => {
    if (!accessToken.value) {
      return false;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(accessToken.value);
      const now = Date.now() / 1000; // Convert to seconds
      return decoded.exp != null && now < decoded.exp;
    } catch (e) {
      return false;
    }
  });

  // Watch authentication changes from other tabs
  watch(isAuthenticated, () => {
    if (isAuthenticated.value) {
      if (router.currentRoute.value.name === 'login') {
        try {
          const maybeRedirect = queryRedirect.parse(router.currentRoute.value);
          const redirect = maybeRedirect.query.redirect;
          if (redirect.startsWith('/')) { // avoid possible third-party redirection
            router.push(redirect);
            return;
          } else {
            console.debug('UserStore::isAuthenticated() Refusing to redirect to', redirect);
          }
        } catch (e) {
          // do nothing
        }
        router.push({
          name: 'index',
        });
        return;
      }
    } else {
      $reset();   // wipes tokens if tokens are expired
      if (router.currentRoute.value.name !== 'login') {
        // Preserve destination
        const currentPath = router.currentRoute.value.fullPath;
        if (currentPath !== '/') {
          const query: any = {};
          query.redirect = currentPath;
          router.push({ name: 'login', query });
          return;
        }
        router.push({
          name: 'login',
        });
        return;
      }
    }
  });

  // Helper method to get refresh token for dev environments
  function getDevRefreshToken() {
    return osimRuntime.value.env === 'dev' ? _userStoreSession.value.refresh : null;
  }

  // Helper method to set refresh token for dev environments
  function setDevRefreshToken(refresh: string) {
    if (osimRuntime.value.env === 'dev') {
      _userStoreSession.value.refresh = refresh;
    }
  }

  return {
    isLoggedIn: _userStoreSession.value.isLoggedIn,
    accessToken,
    isAccessTokenExpired,
    whoami,
    userName,
    userEmail,
    jiraUsername,
    updateJiraUsername,
    env,
    refreshToken,
    login,
    logout,
    isAuthenticated,
    getDevRefreshToken,
    setDevRefreshToken,
    $reset,
  };
});
