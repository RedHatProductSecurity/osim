import {ref, computed} from 'vue'
import {defineStore} from 'pinia'

import router from '@/router';

interface Jwt {
  user?: string | undefined;
}
export const useUserStore = defineStore('UserStore', () => {


  const jwt = ref<Jwt>({})
  const email = computed(() => jwt.value.user + '@redhat.com');

  let storedUserStore = sessionStorage.getItem('UserStore');
  if (storedUserStore != null) {
    try {
      storedUserStore = JSON.parse(storedUserStore);
      jwt.value = storedUserStore.jwt;
    } catch (e) {
      console.error('Unable to restore the UserStore from sessionStorage', e);
    }

  }

  function login(user: string) {
    return Promise.resolve(user)
        .then(user => {
          jwt.value.user = user;
        })
  }

  function logout() {
    return Promise.resolve()
        .then(() => {
          jwt.value.user = undefined;
        })
        .then(() => {
          router.push({name: 'login'})
        })
  }

  function isAuthenticated() {
    return jwt.value.user != null;
  }

  function $reset() {
    jwt.value = {};
  }

  return {
    jwt,
    email,
    login,
    logout,
    isAuthenticated,
    $reset,
  };
});

