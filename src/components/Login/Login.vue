<script setup lang="ts">
import { computed, ref } from 'vue';

import { useAuthStore } from '@/stores/AuthStore';
import { osimRuntime } from '@/stores/osimRuntime';

// const router = useRouter();
const userStore = useAuthStore();
// const route = useRoute();

const username = ref('');
const password = ref('');
const error = ref('');

// const queryRedirect = z.object({
//   query: z.object({
//     redirect: z.string(),
//   }),
// });

const working = ref(false);
const isPasswordRevelead = ref(false);
const loginMsg = computed(() => {
  switch (osimRuntime.value.backends.osidbAuth) {
    case 'credentials': {
      return 'Login with credentials';
    }
    case 'kerberos': {
      return 'Login with System GSSAPI';
    }
    default: {
      return 'Login disabled';
    }
  }
});

function login() {
  // userStore.login(username.value)
  Promise.resolve()
  // Promise.reject('fake error')
    .then(() => {
      working.value = true;
      error.value = '';
    })
    .then(() => userStore.login(username.value, password.value))
  // .then(() => {
  //   try {
  //     const maybeRedirect = queryRedirect.parse(route);
  //     let redirect = maybeRedirect.query.redirect;
  //     console.log('login component route,', route);
  //     if (redirect.startsWith('/')) { // avoid possible third-party redirection
  //       console.log('login component router push to redirect', redirect);
  //       router.push(redirect);
  //       return;
  //     } else {
  //       console.log('Refusing to redirect to', redirect);
  //     }
  //   } catch (e) {
  //     // do nothing
  //   }
  //   console.log('login component redirect to index');
  //   router.push({
  //     name: 'index'
  //   });
  // })
    .catch((e) => {
      console.error('Login::login() Error logging in', e);
      if (osimRuntime.value.backends.osidbAuth === 'kerberos') {
        error.value = [
          '<strong>Kerberos authentication failed.</strong>',
          '<strong>Troubleshooting steps:</strong>',
          '1. Run <code>kinit</code> to refresh/ensure you have a valid Kerberos token.',
          '2. Verify your browser trusts this site for Negotiate authentication:',
          '   • <strong>CSB users:</strong> Verify your CSB configuration is correct. '
          + 'If settings appear incorrect, contact the IT Endpoint team for support.',
          '   • <strong>Firefox:</strong> Ensure <code>network.negotiate-auth.trusted-uris</code> '
          + 'in <code>about:config</code> includes "redhat.com".',
          '   • <strong>Chrome:</strong> Launch with <code>--auth-server-whitelist="*.redhat.com"</code>',
        ].join('<br>');
      } else if (osimRuntime.value.backends.osidbAuth === 'credentials') {
        password.value = '';
        error.value = 'Error logging in. Wrong username or password.';
      }
    })
    .finally(() => {
      working.value = false;
    });
}
</script>

<template>
  <div>
    <div v-if="error !== ''" class="row mb-3 text-center">
      <div class="alert alert-danger osim-error-message" role="alert">
        <i class="bi-exclamation-triangle-fill me-2"></i>
        <!-- eslint-disable vue/no-v-html -->
        <span v-html="error"></span>
        <!-- eslint-enable -->
      </div>
    </div>
    <form class="container" @submit.prevent="login">
      <h1 class="h4 mb-3 mt-2">Open Security Issue Management</h1>

      <!--<div class="row mb-3 text-center">-->
      <!--  <span class="col">Login</span>-->
      <!--</div>-->

      <div v-if="osimRuntime.backends.osidbAuth === 'credentials'" class="row mb-3">
        <div class="col">
          <label for="username" class="visually-hidden">Username</label>
          <div class="input-group">
            <input
              id="username"
              v-model="username"
              type="text"
              class="form-control"
              placeholder="username"
            >
          </div>
          <div class="input-group">
            <input
              id="password"
              v-model="password"
              :type="isPasswordRevelead ? 'text' : 'password'"
              class="form-control"
              placeholder="password"
            >
            <button
              id="reveal-password"
              class="btn btn-outline-secondary"
              type="button"
              @click="isPasswordRevelead = !isPasswordRevelead"
            >
              <i
                :class="{
                  'bi-eye-fill': !isPasswordRevelead,
                  'bi-eye-slash-fill': isPasswordRevelead}
                "
              ></i>
            </button>
          </div>
        </div>
      </div>

      <div class="row mb-3">
        <div class="col">
          <button
            class="btn btn-primary align-self-end"
            type="submit"
            :disabled="working"
          >
            <span
              v-if="working"
              class="spinner-border spinner-border-sm d-inline-block"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            {{ loginMsg }}
          </button>
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
