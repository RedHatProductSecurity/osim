import { computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { z } from 'zod';
import jwtDecode from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';
import { useSessionStorage } from '@vueuse/core';

// const router = useRouter();
import router from '@/router';

import { osimRuntime } from '@/stores/osimRuntime';

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

const userStoreSessionStorage = z.object({
  refresh: z.string(),
  env: z.string(),
  whoami: whoamiResponse.nullable(),
});
type UserStoreSessionStorage = z.infer<typeof userStoreSessionStorage>;

// Vue bug: the whole chain of data uses reactivity, 
// but ref doesn't work with the watch; only reactive does.
// const _userStore = reactive<UserStoreSessionStorage>({refresh: '', env: '', whoami: null});
const _userStoreSession = useSessionStorage(
  _userStoreKey, { refresh: '', env: '', whoami: null } as UserStoreSessionStorage
);
// watchEffect(() => {
//   _userStoreSession.value = _userStore;
// });
//
// const workerReady = serviceWorkerClient.listen(_userStoreKey, value => {
//   if (value == null) {
//     Object.assign(_userStore, {refresh: '', env: '', whoami: null});
//   }
//   let newUserStore = userStoreSessionStorage.safeParse(value);
//   if (newUserStore.success) {
//     if (JSON.stringify(newUserStore.data) !== JSON.stringify(_userStore)) {
//       // New value; update
//       Object.assign(_userStore, newUserStore.data);
//       // _userStore = newUserStore.data;
//     }
//   }
// });
// // Top-level await is not available in the configured target environment "es2020"
// // await workerReady;
// export {workerReady};
//
// watch(_userStore, () => {
//   serviceWorkerClient.put(_userStoreKey, JSON.parse(JSON.stringify(_userStore)));
// });

export const useUserStore = defineStore('UserStore', () => {

  const refresh = computed<string>(() => {
    return _userStoreSession.value.refresh;
  });

  const jwtRefresh = computed<JwtPayload | null>(() => {
    try {
      return jwtDecode(_userStoreSession.value.refresh);
    } catch (e) {
      console.debug('UserStore: refresh token not a valid JWT', refresh.value, e);
    }
    return null;
  });

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

  // let refreshInterval = 30000;
  // let refreshId = 0;


  function setTokens(refresh_: string, env_: string) {
    _userStoreSession.value.refresh = refresh_;
    _userStoreSession.value.env = env_;
  }

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
      })
      .catch(e => {
        $reset();
        console.error('UserStore: unsuccessful login request', e);
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

  /**
   * Side effect: wipes tokens if tokens are expired
   */
  const isAuthenticated = computed<boolean>(() => {
    const now = Date.now();
    const refreshExp = jwtRefresh.value?.exp;
    if (refreshExp != null) {
      return now < refreshExp * 1000;
    }
    $reset();
    return false;
  });

  // Watch authentication changes from other tabs
  watch(isAuthenticated, () => {
    console.log('isAuthenticated changed, current route:', router.currentRoute);
    console.log('isAuthenticated changed, isAuthenticated:', isAuthenticated.value);
    if (isAuthenticated.value) {
      if (router.currentRoute.value.name === 'login') {
        console.log('isAuthenticated became true while on login page');

        try {
          const maybeRedirect = queryRedirect.parse(router.currentRoute.value);
          const redirect = maybeRedirect.query.redirect;
          if (redirect.startsWith('/')) { // avoid possible third-party redirection
            console.log('UserStore watch redirect:', redirect);
            router.push(redirect);
            return;
          } else {
            console.log('Refusing to redirect to', redirect);
          }
        } catch (e) {
          // do nothing
        }
        console.log('UserStore watch push to index');
        router.push({
          name: 'index',
        });
        return;
      }
    } else {
      console.log(router.currentRoute.value);
      if (router.currentRoute.value.name !== 'login') {
        console.log('isAuthenticated became false while not on login page');

        // Preserve destination
        const currentPath = router.currentRoute.value.fullPath;
        console.log('current path:', currentPath);
        if (currentPath !== '/') {
          const query: any = {};
          query.redirect = currentPath;
          console.log('UserStore unauthenticated path not slash to login');
          router.push({ name: 'login', query });
          return;
        }
        console.log('UserStore unauthenticated to login');
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
  }

  return {
    refresh,
    jwtRefresh,
    whoami,
    userName,
    userEmail,
    env,
    login,
    logout,
    isAuthenticated,
    $reset,
  };
});

