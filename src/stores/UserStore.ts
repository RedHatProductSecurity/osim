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
import { useSettingsStore } from './SettingsStore';

export const queryRedirect = z.object({
  query: z.object({
    redirect: z.string(),
  }),
});


const _userStoreKey = 'UserStore';

const loginResponse = z.object({
  access: z.string(),
  refresh: z.string(),
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

const userStoreLocalStorage = z.object({
  refresh: z.string(),
  env: z.string(),
  whoami: whoamiResponse.nullable(),
  jiraUsername: z.string(),
});
export type UserStoreLocalStorage = z.infer<typeof userStoreLocalStorage>;

const _userStoreSession = useLocalStorage(
  _userStoreKey, { refresh: '', env: '', whoami: null, jiraUsername: '' } as UserStoreLocalStorage
);

export const useUserStore = defineStore('UserStore', () => {

  const settingsStore = useSettingsStore();

  const refresh = computed<string>(() => {
    return _userStoreSession.value.refresh;
  });

  const jwtRefresh = computed<JwtPayload | null>(() => {
    if (!_userStoreSession.value.refresh) {
      return null;
    }
    try {
      return jwtDecode(_userStoreSession.value.refresh);
    } catch (e) {
      console.debug('UserStore: refresh token not a valid JWT', refresh.value, e);
    }
    return null;
  });

  const accessToken = ref<string>();
  const isAccessTokenExpired = () => {
    try {
      const exp = accessToken.value ? jwtDecode<JwtPayload>(accessToken.value)?.exp : null;
      return !exp || DateTime.now().toSeconds() >= exp - 60;
    } catch (e) {
      console.debug('UserStore: access token not a valid JWT', accessToken.value, e);
      return true;
    }
  };

  const whoami = computed<WhoamiType | null>(() => {
    return _userStoreSession.value.whoami || null;
  });
  const userName = computed(() => {
    if (_userStoreSession.value.refresh === '') {
      return 'Not Logged In';
    }
    if (_userStoreSession.value.whoami != null) {
      return _userStoreSession.value.whoami.email ?? _userStoreSession.value.whoami.username;
    }
    let sub = jwtRefresh.value?.sub;
    if (sub == null) {
      sub = 'Current User';
    }
    return sub;
  });
  const userEmail = computed(() => {
    if (_userStoreSession.value.refresh === '') {
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

  async function updateJiraUsername() {
    if (_userStoreSession.value.jiraUsername === '') {
      const name = await getJiraUsername();
      if (name) {
        _userStoreSession.value.jiraUsername = name;
      }
    }
  }

  watch(
    () => settingsStore.settings.jiraApiKey,
    async () => {
      await updateJiraUsername();
    }
  );


  function setTokens(refresh_: string, env_: string) {
    _userStoreSession.value.refresh = refresh_;
    _userStoreSession.value.env = env_;
  }

  async function login(username: string = '', password: string = '') {
    const requestMetadata: { [key: string]: any } = {};
    if (osimRuntime.value.backends.osidbAuth == 'kerberos') {
      requestMetadata['method'] = 'GET';
    } else if (osimRuntime.value.backends.osidbAuth == 'credentials') {
      requestMetadata['method'] = 'POST';
      requestMetadata['body'] = JSON.stringify({ username: username, password: password });
      requestMetadata['headers'] = {
        'Content-Type': 'application/json'
      };
    }

    return fetch(`${osimRuntime.value.backends.osidb}/auth/token`, {
      // credentials: 'same-origin',
      credentials: 'include',
      cache: 'no-cache',
      ...requestMetadata,
    })
      .then(async response => {
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
        _userStoreSession.value.refresh = parsedLoginResponse.refresh;
        _userStoreSession.value.env = parsedLoginResponse.env;
        return parsedLoginResponse.access;
      })
      .then((access) => {
        return fetch(`${osimRuntime.value.backends.osidb}/osidb/whoami`, {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            Authorization: `Bearer ${access}`
          },
        });
      })
      .then(response => response.json())
      .then(json => {
        const parsedWhoamiResponse = whoamiResponse.parse(json);
        _userStoreSession.value.whoami = parsedWhoamiResponse;
      }).then(async () => {
        await updateJiraUsername();
      })
      .catch(e => {
        $reset();
        console.error('UserStore::login() unsuccessful login request', e);
        throw e;
      });
  }

  function logout() {
    // clearInterval(refreshInterval);
    $reset();

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
    const now = Date.now();
    const refreshExp = jwtRefresh.value?.exp;
    if (refreshExp != null) {
      return now < refreshExp * 1000;
    }
    return false;
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
            console.log('UserStore::isAuthenticated() Refusing to redirect to', redirect);
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

  function $reset() {
    setTokens('', '');
    _userStoreSession.value.whoami = null;
    _userStoreSession.value.jiraUsername = '';
  }

  return {
    refresh,
    accessToken,
    isAccessTokenExpired,
    jwtRefresh,
    whoami,
    userName,
    userEmail,
    jiraUsername,
    updateJiraUsername,
    env,
    login,
    logout,
    isAuthenticated,
    $reset,
  };
});

