import {createRouter, createWebHistory, useRouter} from 'vue-router'
import {nextTick as vueNextTick, watch} from 'vue';
import IndexView from '../views/IndexView.vue'
import LoginView from '../views/LoginView.vue';
import FlawEditView from '../views/FlawEditView.vue';
import {useUserStore} from '@/stores/UserStore';
import FlawCreateView from '@/views/FlawCreateView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import FlawSearchView from '@/views/FlawSearchView.vue';
import TrackerDetailView from '@/views/TrackerDetailView.vue';
import SettingsView from '@/views/SettingsView.vue';
import LogoutView from '@/views/LogoutView.vue';
import WidgetTestView from '@/views/WidgetTestView.vue';


// FIXME: Fix URL handling when clicking logout, then pressing the back button.
//        The URL should remain at /login while not logged-in.
//        Vue doesn't seem to care (??? / !!!) but it's only a cosmetic issue...
//        Something like this snippet was reported to work, but I haven't figured it out yet.
let popStateDetected = false;
let popStateEvent: PopStateEvent | null = null;
window.addEventListener('popstate', (e) => {
  popStateEvent = e;
  popStateDetected = true;
})

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
        title: 'Login',
        hideNavbar: true,
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
      path: '/widget-test',
      name: 'widget-test',
      component: WidgetTestView,
      meta: {
        title: 'Sample',
      },
    },

    {
      path: '/tracker/:id',
      name: 'tracker-details',
      props: true,
      component: TrackerDetailView,
      meta: {
        title: 'Tracker Details',
      },
    },

    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        title: 'Page Not Found',
      },
    },

    // {
    //   path: '/about/:id',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue')
    //   meta: {
    //     title: 'About',
    //   },
    // },
  ]
})


router.beforeEach(async (to, from) => {
  const isNavigationBackButton = popStateDetected;
  const popState = popStateEvent?.state;
  popStateDetected = false;
  popStateEvent = null;

  // await workerReady;

  const userStore = useUserStore();
  const isAuthenticated = userStore.isAuthenticated;

  const toLogin = to.name === 'login';
  let manualLocationNavigation = from.name === undefined;

  if (to.name === 'widget-test') { // Temporary snapshot code
    return true;
  }

  console.log('Going to login?', toLogin);
  if (isAuthenticated) {
    console.log('user is authenticated');
    console.log('from route', from);
    console.log('to route', to);
    if (toLogin) {
      if (manualLocationNavigation) {
        console.log('authenticated to login redirect to index');
        return {name: 'index'};
      }
    }
    console.log('!toLogin:', !toLogin);
    return !toLogin;
  }

  if (!toLogin) {
    if (isNavigationBackButton) {
      console.log('unauthenticated not to login pressed back');
      history.pushState(popState, '', router.resolve({name: 'login'}).path);
      return {name: 'login'};
    }
    let query: any = {};
    if (manualLocationNavigation) { // Preserve destination
      query.redirect = to.fullPath;
    }

    console.log('not authenticated, redirecting to login page');
    return {name: 'login', query};
  }
  console.log('not authenticated, should already be at login page');

});

router.afterEach((to, from) => {
  vueNextTick(() => {
    document.title = 'OSIM | ' + to.meta.title;
  })
})

export default router;
