<script setup lang="ts">
import { useAuthStore } from '@/stores/AuthStore';

const authStore = useAuthStore();
authStore.logout();
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
