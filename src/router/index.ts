import {createRouter, createWebHistory} from 'vue-router'
import IndexView from '../views/IndexView.vue'
import LoginView from '../views/LoginView.vue';
import IssueDetails from '../views/IssueDetails.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'index',
      component: IndexView,
    },
    {
      path: '/issue-details',
      name: 'issue-details',
      component: IssueDetails,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        hideNavbar: true,
      },
    },
    // {
    //   path: '/about/:id',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue')
    // },
  ]
})

export default router
