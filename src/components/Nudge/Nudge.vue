<script setup lang="ts">
defineProps<{
  isVisible: boolean;
  tooltip: string;
}>();
</script>

<template>
  <span v-if="isVisible" class="ms-1" :title="tooltip">
    <i class="bi bi-exclamation-diamond-fill text-warning" />
  </span>
</template>

<style scoped lang="scss">
@import '@/scss/redhat-brand-colors.scss';

i {
  color: $redhat-orange-50;
}
</style>
