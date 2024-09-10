import { nextTick as vueNextTick } from 'vue';

import {
  createRouter,
  createWebHistory,
  type NavigationGuardNext,
  type RouteLocationNormalized,
} from 'vue-router';

import { useUserStore } from '@/stores/UserStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import { notifyApiKeyUnset } from '@/services/ApiKeyService';
import FlawCreateView from '@/views/FlawCreateView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import FlawSearchView from '@/views/FlawSearchView.vue';
import SettingsView from '@/views/SettingsView.vue';
import LogoutView from '@/views/LogoutView.vue';
import WidgetTestView from '@/views/WidgetTestView.vue';
import { osimRuntime } from '@/stores/osimRuntime';

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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      beforeEnter: apiKeysGuard(),
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
        const userStore = useUserStore();
        if (userStore.isAuthenticated) {
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
      beforeEnter() {
        if (areApiKeysNotSet() && osimRuntime.value.readOnly) {
          notifyApiKeyUnset();
        }
      },
    },
    {
      path: '/widget-test',
      name: 'widget-test',
      component: WidgetTestView,
      meta: {
        canVisitWithoutAuth: true,
        title: 'Sample',
      },
      beforeEnter() {
        if (osimRuntime.value.env !== 'dev') {
          return { name: 'not-found' };
        }
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
  ],
});

function areApiKeysNotSet(): boolean {
  const {
    settings: { bugzillaApiKey, jiraApiKey },
  } = useSettingsStore();
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

    if (noKeysAreSet) {
      notifyApiKeyUnset();
    }

    if (noKeysAreSet && shouldRedirectToSettings) {
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

  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;

  const { canVisitWithoutAuth } = to.meta;
  const manualLocationNavigation = from.name === undefined;

  if (!canVisitWithoutAuth && !isAuthenticated) {
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
    document.title = 'OSIM | ' + to.meta.title;
  });
});

export default router;
