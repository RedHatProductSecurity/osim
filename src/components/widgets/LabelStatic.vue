<script setup lang="ts">
defineProps<{
  modelValue: string | number | null | undefined;
  label: string;
  error?: string;
  hasTopLabelStyle?: boolean;
}>();
</script>

<template>
  <div class="osim-static-label osim-input mb-3 ps-3">
    <div v-if="hasTopLabelStyle" class="osim-static-label-top-style">
      <span class="top-label">
        {{ label }}
      </span>
      <div :class="{ 'alert alert-warning': !modelValue }">
        <span class="form-control">{{ modelValue }}</span>
      </div>
    </div>
    <div v-else class="row">
      <span class="form-label col-3">
        {{ label }}
      </span>
      <div class="col-9" :class="{ 'alert alert-warning': !modelValue }">
        <span class="form-control">{{ modelValue }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.osim-static-label .osim-static-label-top-style .top-label{
  display: inline-block;
  background-color: #DEE2E6;
  border-top-left-radius: .5rem;
  border-top-right-radius: .5rem;
  padding-top: .375rem;
  padding-bottom: .25rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
</style>