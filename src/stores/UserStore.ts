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
});

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

  const userName = computed(() => {
    if (refresh.value === '') {
      return 'Not Logged In';
    }
    let sub = jwtRefresh.value?.sub;
    if (sub == null) {
      // @ts-ignore
      sub = 'User ID: ' + jwtAccess.value?.user_id;
    }
    if (sub == null) {
      // fallback: look for user in domain root
      sub = document.cookie
          .split(';')
          .map(x => x.trim())
          .filter(x => /^.._user=/.test(x))
          .map(x => x.substring('.._user='.length))
          .reduce((acc: string[], x) => acc.concat(x.split('|')), [])
          .map(x => decodeURIComponent(x))
          .find(x => true)
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
    // refreshId = setInterval(performTokenRefresh, 5000);
    // writeSessionStorage()
  }

  readSessionStorage(); // Initially read when loading UserStore
  function readSessionStorage() {
    let storedUserStore = sessionStorage.getItem(_sessionStorageKey);
    if (storedUserStore != null) {
      try {
        storedUserStore = JSON.parse(storedUserStore);
        // @ts-ignore
        access.value = storedUserStore.access;
        // @ts-ignore
        refresh.value = storedUserStore.refresh;
        // @ts-ignore
        env.value = storedUserStore.env;
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
        .then(response => response.json())
        .then(json => {
          const parsedLoginResponse = loginResponse.passthrough().parse(json);
          access.value = parsedLoginResponse.access;
          refresh.value = parsedLoginResponse.refresh;
          env.value = parsedLoginResponse.env;
        })
        .catch(e => {
          console.error('UserStore: unsuccessful login request', e);
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
  }

  return {
    refresh,
    jwtRefresh,
    userName,
    env,
    login,
    logout,
    isAuthenticated,
    $reset,
  };
});

