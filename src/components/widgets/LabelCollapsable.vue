<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  label: string;
  error?: string;
}>();
const isExpanded = ref(false);
</script>

<template>
  <div class="osim-collapsable-label mb-3 border-start ps-3">
    <label class="form-label" @click="isExpanded=!isExpanded">
      {{ label }}
      <i v-if="isExpanded" class="bi bi-dash-square-dotted ms-1"></i>
      <i v-else class="bi bi-plus-square-dotted ms-1"></i>
      <p v-if="!isExpanded" class="mt-2 mb-2">...</p>
    </label>
    <!-- <div class="form-control" :class="{ 'alert alert-warning': !modelValue }">
      <span>{{ modelValue }}</span>
    </div> -->
    <slot v-if="isExpanded" />
  </div>
</template>

<style scoped></style>
