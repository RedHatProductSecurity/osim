<script setup lang="ts">
defineProps<{
  modelValue: string;
  label: string;
  error?: string;
}>();
</script>

<template>
  <div class="osim-input mb-3 border-start ps-3">
    <span class="form-label">
      {{ label }}
    </span>
    <div class="osim-pill-list form-control" :class="{ 'alert alert-warning': !modelValue }">
      {{ modelValue }}
    </div>
    <slot></slot>
  </div>
</template>
