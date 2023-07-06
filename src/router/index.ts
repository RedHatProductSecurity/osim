import {createRouter, createWebHistory} from 'vue-router'
import {nextTick as vueNextTick} from 'vue';
import IndexView from '../views/IndexView.vue'
import LoginView from '../views/LoginView.vue';
import FlawDetailView from '../views/FlawDetailView.vue';
import {useUserStore} from '@/stores/UserStore';
import FlawCreateView from '@/views/FlawCreateView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import FlawSearchView from '@/views/FlawSearchView.vue';
import TrackerDetailView from '@/views/TrackerDetailView.vue';
import SettingsView from '@/views/SettingsView.vue';
import LogoutView from '@/views/LogoutView.vue';


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
      component: FlawDetailView,
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


router.beforeEach((to, from) => {
  const isNavigationBackButton = popStateDetected;
  const popState = popStateEvent?.state;
  popStateDetected = false;
  popStateEvent = null;

  const {isAuthenticated} = useUserStore();

  const toLogin = to.name === 'login';
  let manualLocationNavigation = from.name === undefined;

  console.log('Going to login?', toLogin);
  if (isAuthenticated()) {
    console.log('user is authenticated');
    console.log('from route', from);
    if (toLogin) {
      if (manualLocationNavigation) {
        return {name: 'index'};
      }
    }
    return !toLogin;
  }

  if (!toLogin) {
    if (isNavigationBackButton) {
      history.pushState(popState, '', router.resolve({name: 'login'}).path);
      return {name: 'login'};
    }
    let query: any = {};
    if (manualLocationNavigation) { // Preserve destination
      query.redirect = to.fullPath;
    }
    console.log('not authenticated, redirecting to login page')
    return {name: 'login', query};
  }
  console.log('not authenticated, should already be at login page')

});

router.afterEach((to, from) => {
  vueNextTick(() => {
    document.title = 'OSIM | ' + to.meta.title;
  })
})

export default router
