import {ref, computed} from 'vue';
import {defineStore} from 'pinia';
import {z} from 'zod';
import jwtDecode from 'jwt-decode';
import type {JwtPayload} from 'jwt-decode';

import router from '@/router';
import {osimRuntime} from '@/stores/osimRuntime';

const _sessionStorageKey = 'UserStore';

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

const userStoreSessionStorage = z.object({
  refresh: z.string(),
  env: z.string(),
  whoami: whoamiResponse,
});
type UserStoreSessionStorage = z.infer<typeof userStoreSessionStorage>;

export const useUserStore = defineStore('UserStore', () => {

  const refresh = ref<string>('');

  const jwtRefresh = computed<JwtPayload | null>(() => {
    try {
      return jwtDecode(refresh.value);
    } catch (e) {
      console.debug('UserStore: refresh token not a valid JWT', refresh.value, e);
    }
    return null;
  });

  const whoami = ref<WhoamiType | null>(null);
  const userName = computed(() => {
    if (refresh.value === '') {
      return 'Not Logged In';
    }
    if (whoami.value != null) {
      return whoami.value.email ?? whoami.value.username;
    }
    let sub = jwtRefresh.value?.sub;
    if (sub == null) {
      // @ts-ignore
      sub = 'User ID: ' + jwtAccess.value?.user_id;
    }
    if (sub == null) {
      sub = 'Current User';
    }
    return sub;
  });

  const env = ref<string>(''); // Placeholder: environment

  // let refreshInterval = 30000;
  // let refreshId = 0;


  function setTokens(refresh_: string, env_: string) {
    refresh.value = refresh_;
    env.value = env_;
  }

  readSessionStorage(); // Initially read when loading UserStore
  function readSessionStorage() {
    let storedUserStore = sessionStorage.getItem(_sessionStorageKey);
    if (storedUserStore != null) {
      try {
        const parsedUserStore: UserStoreSessionStorage = userStoreSessionStorage.parse(JSON.parse(storedUserStore));
        refresh.value = parsedUserStore.refresh;
        env.value = parsedUserStore.env;
        whoami.value = parsedUserStore.whoami;
      } catch (e) {
        console.error('UserStore: unable to restore from sessionStorage', e);
        $reset();
      }
    }
  }

  // function login(jwtAccess, jwtRefresh) {
  //   return userService.login()
  //       .then(user => {
  //         jwt.value.user = JSON.stringify(user);
  //       })
  // }
  async function login() {
    // return fetch('https://osidb-stage.prodsec.redhat.com/auth/token', {
    return fetch(`${osimRuntime.value.backends.osidb}/auth/token`, {
      // credentials: 'same-origin',
      credentials: 'include',
      cache: 'no-cache',
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
          refresh.value = parsedLoginResponse.refresh;
          env.value = parsedLoginResponse.env;
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
          whoami.value = parsedWhoamiResponse;
        })
        .catch(e => {
          $reset();
          console.error('UserStore: unsuccessful login request', e);
          throw e;
        });
  }

  // function writeSessionStorage() {
  //   let storedUserStore = {
  //     access: access.value,
  //     refresh: refresh.value,
  //     env: _env.value,
  //     _modifyDate: Date.now(),
  //   };
  //   sessionStorage.setItem(_sessionStorageKey, JSON.stringify(storedUserStore));
  // }

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
    return router.push({name: 'login'});
  }

  /**
   * Side effect: wipes tokens if tokens are expired
   */
  function isAuthenticated() {
    let now = Date.now();
    let refreshExp = jwtRefresh.value?.exp;
    if (refreshExp != null) {
      return now < refreshExp * 1000;
    }
    $reset();
    return false;
  }

  function $reset() {
    setTokens('', '');
    whoami.value = null;
  }

  return {
    refresh,
    jwtRefresh,
    whoami,
    userName,
    env,
    login,
    logout,
    isAuthenticated,
    $reset,
  };
});

