<script setup lang="ts">
const props = defineProps<{
  isVisible: boolean;
  tooltip: string;
}>();
</script>

<template>
  <i v-if="isVisible" class="bi-warning" :title="tooltip" />
</template>

<style scoped>
</style>
