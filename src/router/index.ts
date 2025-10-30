import { nextTick as vueNextTick } from 'vue';

import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
} from 'vue-router';

import { useAuthStore } from '@/stores/AuthStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import { notifyApiKeyUnset } from '@/services/ApiKeyService';
import FlawCreateView from '@/views/FlawCreateView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import FlawSearchView from '@/views/FlawSearchView.vue';
import SettingsView from '@/views/SettingsView.vue';
import LogoutView from '@/views/LogoutView.vue';
import { osimRuntime } from '@/stores/osimRuntime';
import { getNextAccessToken } from '@/services/OsidbAuthService';

import FlawEditView from '../views/FlawEditView.vue';
import IndexView from '../views/IndexView.vue';
import LoginView from '../views/LoginView.vue';

// FIXME: Fix URL handling when clicking logout, then pressing the back button.
//        The URL should remain at /login while not logged-in.
//        Vue doesn't seem to care (??? / !!!) but it's only a cosmetic issue...
//        Something like this snippet was reported to work, but I haven't figured it out yet.
let popStateDetected = false;
let popStateEvent: null | PopStateEvent = null;
window.addEventListener('popstate', (e) => {
  popStateEvent = e;
  popStateDetected = true;
});

export const routes = [
  {
    path: '/',
    name: 'index',
    component: IndexView,
    meta: {
      title: 'Index',
    },
  },
  {
    path: '/flaws/new', // must be above /flaws/:id
    name: 'flaw-create',
    component: FlawCreateView,
    meta: {
      title: 'Create Flaw',
    },
    beforeEnter: apiKeysGuard(true),
  },
  {
    path: '/flaws/:id',
    name: 'flaw-details',
    component: FlawEditView,
    props: true,
    meta: {
      title: 'Flaw Details',
    },
  },
  {
    path: '/search',
    name: 'search',
    component: FlawSearchView,
    props: true,
    meta: {
      title: 'Flaw Search',
    },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      canVisitWithoutAuth: true,
      title: 'Login',
      hideNavbar: true,
    },
    beforeEnter() {
      const authStore = useAuthStore();
      if (authStore.isAuthenticated) {
        return { name: 'index' };
      }
    },
  },
  {
    path: '/logout',
    name: 'logout',
    component: LogoutView,
    meta: {
      title: 'Logout',
      hideNavbar: true,
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      title: 'Settings',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      canVisitWithoutAuth: true,
      title: 'Page Not Found',
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

function areApiKeysNotSet(): boolean {
  const settingsStore = useSettingsStore();
  const { bugzillaApiKey, jiraApiKey } = settingsStore.apiKeys;
  return !bugzillaApiKey || !jiraApiKey;
}

function apiKeysGuard(shouldRedirectToSettings = false) {
  return (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const noKeysAreSet = areApiKeysNotSet();

    if (osimRuntime.value.readOnly) {
      next();
      return;
    }

    if (noKeysAreSet && shouldRedirectToSettings) {
      notifyApiKeyUnset();
      next('/settings');
      return;
    }

    next();
  };
}

router.beforeEach(async (to, from) => {
  const isNavigationBackButton = popStateDetected;
  const popState = popStateEvent?.state;
  popStateDetected = false;
  popStateEvent = null;

  // await workerReady;

  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;

  const { canVisitWithoutAuth } = to.meta;
  const manualLocationNavigation = from.name === undefined;

  if (
    authStore.isLoggedIn
    && to.name !== 'logout'
    && to.name !== 'login'
  ) {
    try {
      console.debug('Router: Refreshing access token');
      await getNextAccessToken();
    } catch (error) {
      console.error('Router: Failed to refresh access token during navigation', error);
    }
  }

  if (!canVisitWithoutAuth && !isAuthenticated) {
    // If user is logged in but token is expired/missing, try to refresh first
    if (authStore.isLoggedIn) {
      try {
        console.debug('Router: Attempting token refresh for authenticated user');
        await getNextAccessToken();
        // If refresh succeeds, continue with navigation
        if (authStore.isAuthenticated) {
          return;
        }
      } catch (error) {
        console.debug('Router: Token refresh failed, redirecting to login', error);
      }
    }

    if (isNavigationBackButton) {
      history.pushState(popState, '', router.resolve({ name: 'login' }).path);
      return { name: 'login' };
    }
    const query: any = {};
    if (manualLocationNavigation) {
      // Preserve destination
      query.redirect = to.fullPath;
    }

    return { name: 'login', query };
  }
});

router.afterEach((to) => {
  vueNextTick(() => {
    document.title = `OSIM ${environmentString()}| ${to.meta.title}`;
  });
});

function environmentString() {
  if (window.location.hostname.includes('localhost')) return 'Local ';
  if (window.location.hostname.includes('stage')) return 'Stage ';
  if (window.location.hostname.includes('uat')) return 'UAT ';
  return '';
}

export default router;
