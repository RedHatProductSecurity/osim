<script setup lang="ts">
defineProps<{
  modelValue: string | number | null | undefined;
  label: string;
  error?: string;
}>();
</script>

<template>
  <div class="osim-static-label mb-3 border-start ps-3">
    <div class="row">
      <span class="form-label col-3">
        {{ label }}
      </span>
      <div class="col-9" :class="{ 'alert alert-warning': !modelValue }">
        <span class="form-control">{{ modelValue }}</span>
      </div>
    </div>
  </div>
</template>
