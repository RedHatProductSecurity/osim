<script setup lang="ts">
import Login from '@/components/Login/Login.vue';
</script>

<template>
  <main>
    <Login />
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
