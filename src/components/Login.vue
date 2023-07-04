<script setup lang="ts">
import {useUserStore} from '@/stores/UserStore';
import {ref} from 'vue';
import {useRouter, useRoute} from 'vue-router';
import {z} from 'zod';

const router = useRouter();
const userStore = useUserStore();
const route = useRoute();

const username = ref('');
const error = ref('');

const queryRedirect = z.object({
  query: z.object({
    redirect: z.string(),
  }),
});

function login(event: Event) {
  // userStore.login(username.value)
  Promise.resolve()
  // Promise.reject('fake error')
      .then(() => {
        error.value = '';
      })
      .then(userStore.login)
      .then(() => {
        try {
          const maybeRedirect = queryRedirect.parse(route);
          let redirect = maybeRedirect.query.redirect;
          if (redirect.startsWith('/')) { // avoid possible third-party redirection
            router.push(redirect);
            return;
          } else {
            console.log('Refusing to redirect to', redirect);
          }
        } catch (e) {
          // do nothing
        }
        router.push({
          name: 'index'
        });
      })
      .catch(e => {
        console.debug('Error logging in', e);
        error.value = [
          'Error logging in.',
          'Ensure that your system has krb5 configured.',
          'Ensure that your browser has the correct trusted URIs for Negotiate authentication.',
          'More info: <a class="alert-link" target="_blank" rel="noopener noreferrer nofollow" href="https://people.redhat.com/mikeb/negotiate/">https://people.redhat.com/mikeb/negotiate/</a>',
        ].join('\n');
      });
}
</script>

<template>
  <div>
    <div class="row mb-3 text-center" v-if="error !== ''">
      <div class="alert alert-danger osim-error-message" role="alert"><i class="bi-exclamation-triangle-fill me-2"></i><span v-html="error"></span></div>
    </div>
  <form class="container" @submit.prevent="login">
    <h1 class="h4 mb-3 mt-2">Open Security Issue Management</h1>

    <!--<div class="row mb-3 text-center">-->
    <!--  <span class="col">Login</span>-->
    <!--</div>-->

    <!--<div class="row mb-3">-->
    <!--  <div class="col">-->
    <!--    <label for="username" class="visually-hidden">Username</label>-->
    <!--    <div class="input-group">-->
    <!--      <input v-model="username" type="text" class="form-control" placeholder="username" id="username">-->
    <!--      <div class="input-group-text">@redhat.com</div>-->
    <!--    </div>-->
    <!--  </div>-->
    <!--</div>-->

    <div class="row mb-3">
      <div class="col">
        <button class="btn btn-primary align-self-end" type="submit">Login with System GSSAPI</button>
      </div>
    </div>
  </form>
  </div>
</template>

<style scoped>
form {
  border: 1px solid black;
  border-radius: var(--bs-border-radius);
  max-width: 500px;
  min-height: min(100vh - 2px, 300px);
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.osim-error-message {

  white-space: pre-wrap;
  text-align: left;
}
</style>
