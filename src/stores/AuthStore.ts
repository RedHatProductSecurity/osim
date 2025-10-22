import { computed, ref, watch } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import jwtDecode from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';
import { useLocalStorage } from '@vueuse/core';
import { DateTime } from 'luxon';

import router from '@/router';
import { osimRuntime } from '@/stores/osimRuntime';

function getDevRefreshToken(): null | string {
  return osimRuntime.value.env === 'dev' ? (localStorage.getItem('AuthStore::refresh') || null) : null;
}

function setDevRefreshToken(token: string) {
  if (osimRuntime.value.env === 'dev') {
    localStorage.setItem('AuthStore::refresh', token);
  }
}

const loginResponse = z.object({
  access: z.string(),
  refresh: z.string().optional(),
  env: z.string(),
  detail: z.string().optional(),
});

export const useAuthStore = defineStore('AuthStore', () => {
  const accessToken = ref<null | string>();
  const refreshToken = ref<null | string>();

  // Persist only login state; tokens remain in-memory except dev refresh token (handled separately)
  const isLoggedIn = useLocalStorage('AuthStore::isLoggedIn', false);

  function $reset() {
    accessToken.value = null;
    refreshToken.value = null;
    isLoggedIn.value = false;
    // Clear dev refresh token storage
    localStorage.removeItem('AuthStore::refresh');
  }

  function isAccessTokenExpired() {
    try {
      const exp = accessToken.value ? jwtDecode<JwtPayload>(accessToken.value)?.exp : null;
      return !exp || DateTime.now().toSeconds() >= exp - 60;
    } catch (e) {
      console.debug('AuthStore: access token not a valid JWT', accessToken.value, e);
      return true;
    }
  }

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
      credentials: 'include',
      cache: 'no-cache',
      ...requestMetadata,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text);
        }
        const json = await response.json();
        const parsedLoginResponse = loginResponse.passthrough().parse(json);
        if (parsedLoginResponse.detail) {
          throw new Error(parsedLoginResponse.detail);
        }
        // Store refresh token policy: dev in localStorage, non-dev in memory
        if (parsedLoginResponse.refresh) {
          if (osimRuntime.value.env === 'dev') {
            setDevRefreshToken(parsedLoginResponse.refresh);
            refreshToken.value = null;
          } else {
            refreshToken.value = parsedLoginResponse.refresh;
          }
        } else {
          refreshToken.value = null;
        }
        accessToken.value = parsedLoginResponse.access;
        isLoggedIn.value = true;
        // expose env to UserStore for persistence/compatibility
        const { useUserStore } = await import('./UserStore');
        useUserStore().setEnv(parsedLoginResponse.env);
        return parsedLoginResponse.access;
      })
      .then((access) => {
        // Fetch whoami and update user store without creating a static import cycle
        return fetch(`${osimRuntime.value.backends.osidb}/osidb/whoami`, {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            Authorization: `Bearer ${access}`,
          },
        });
      })
      .then(response => response.json())
      .then(async (json) => {
        const { whoamiResponse } = await import('./UserStore');
        const parsedWhoamiResponse = whoamiResponse.parse(json);
        const { useUserStore } = await import('./UserStore');
        const userStore = useUserStore();
        userStore.setWhoami(parsedWhoamiResponse);
      })
      .then(async () => {
        const { useUserStore } = await import('./UserStore');
        const userStore = useUserStore();
        await userStore.updateJiraUsername();
      })
      .catch((e) => {
        $reset();
        console.error('AuthStore::login() unsuccessful login request', e);
        throw e;
      });
  }

  function logout() {
    $reset();
    return router.push({ name: 'login' });
  }

  const isAuthenticated = computed<boolean>(() => {
    if (!accessToken.value) {
      return false;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(accessToken.value);
      const now = Date.now() / 1000;
      return decoded.exp != null && now < decoded.exp;
    } catch (e) {
      return false;
    }
  });

  // React to authentication changes similarly to previous UserStore behavior
  watch(isAuthenticated, async () => {
    if (isAuthenticated.value) {
      if (router.currentRoute.value.name === 'login') {
        try {
          const { queryRedirect } = await import('./UserStore');
          const maybeRedirect = queryRedirect.parse(router.currentRoute.value);
          const redirect = maybeRedirect.query.redirect;
          if (redirect.startsWith('/')) {
            router.push(redirect);
            return;
          } else {
            console.debug('AuthStore::isAuthenticated() Refusing to redirect to', redirect);
          }
        } catch (e) {
          // do nothing
        }
        router.push({ name: 'index' });
        return;
      }
    } else {
      // Clear on unauthenticated and redirect to login
      $reset();
      if (router.currentRoute.value.name !== 'login') {
        const currentPath = router.currentRoute.value.fullPath;
        if (currentPath !== '/') {
          const query: any = {};
          query.redirect = currentPath;
          router.push({ name: 'login', query });
          return;
        }
        router.push({ name: 'login' });
        return;
      }
    }
  });

  return {
    isLoggedIn,
    accessToken,
    refreshToken,
    isAccessTokenExpired,
    isAuthenticated,
    getDevRefreshToken,
    setDevRefreshToken,
    login,
    logout,
    $reset,
  };
});
