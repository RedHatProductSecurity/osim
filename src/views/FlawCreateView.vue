<script setup lang="ts">
import FlawForm from '@/components/FlawForm/FlawForm.vue';
</script>

<template>
  <main>
    <FlawForm mode="create" />
  </main>
</template>

<style scoped>
textarea {
  margin-top: 1em;
  white-space: pre-wrap;
  width: 100%;
  height: 20em;
}
</style>
