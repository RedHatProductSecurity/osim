<script setup lang="ts">
import {useUserStore} from '@/stores/UserStore';
import {ref} from 'vue';
import {useRouter} from 'vue-router';

const router = useRouter();
const userStore = useUserStore();

const username = ref('');

function login(event: Event) {
  userStore.login(username.value)
      .then(() => {
        router.push({
          name: 'index'
        })
      })
}
</script>

<template>
  <form class="container" @submit.prevent="login">
    <div class="row mb-3 text-center">
      <span class="col">Login</span>
    </div>
    <div class="row mb-3">
      <div class="col">
        <label for="username" class="visually-hidden">Username</label>
        <div class="input-group">
          <input v-model="username" type="text" class="form-control" placeholder="username" id="username">
          <div class="input-group-text">@redhat.com</div>
        </div>
      </div>
    </div>
    <div class="row mb-3">
      <div class="col">
        <button class="btn btn-primary align-self-end" type="submit">Login</button>
      </div>
    </div>
  </form>
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
</style>
