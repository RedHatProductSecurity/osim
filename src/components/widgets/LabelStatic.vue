<script setup lang="ts">
defineProps<{
  modelValue: string | number | null | undefined;
  label: string;
  error?: string;
}>();
</script>

<template>
  <div class="osim-input mb-3 border-start ps-3">
    <span class="form-label">
      {{ label }}
    </span>
    <div class="form-control" :class="{ 'alert alert-warning': !modelValue }">
      <span>{{ modelValue }}</span>
    </div>
  </div>
</template>

