<script setup lang="ts">
import {useUserStore} from '@/stores/UserStore';

const userStore = useUserStore();
userStore.logout();
</script>

<template>
  <main>
    Logging out...
  </main>
</template>

<style scoped>
main {
  height: calc(100vh - var(--osim-status-bar-height));
  width: 100vw;
  min-height: fit-content;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
