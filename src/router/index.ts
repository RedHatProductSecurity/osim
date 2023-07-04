import {createRouter, createWebHistory} from 'vue-router'
import {nextTick as vueNextTick} from 'vue';
import IndexView from '../views/IndexView.vue'
import LoginView from '../views/LoginView.vue';
import FlawDetailView from '../views/FlawDetailView.vue';
import {useUserStore} from '@/stores/UserStore';
import NotFoundView from '@/views/NotFoundView.vue';
import TrackerDetailView from '@/views/TrackerDetailView.vue';

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
      path: '/flaws/:id',
      name: 'flaw-details',
      component: FlawDetailView,
      props: true,
      meta: {
        title: 'Flaw Details',
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
      path: '/tracker/:id',
      name: 'tracker-details',
      props: true,
      component: TrackerDetailView,
      meta: {
        title: 'Tracker Details',
      },
    },

    // {
    //   path: '/flaw-details',
    //   name: 'flaw-details',
    //   component: FlawView,
    // },

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
    return {name: 'login'};
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
