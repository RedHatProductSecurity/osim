<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  label: string;
  error?: string;
}>();
const isExpanded = ref(false);
</script>

<template>
  <div class="osim-collapsable-label mb-3  ps-0">
    <button type="button" class="me-2" @click="isExpanded=!isExpanded">
      <i v-if="isExpanded" class="bi bi-dash-square-dotted me-1"></i>
      <i v-else class="bi bi-plus-square-dotted me-1"></i>
    </button>
    <label class="form-label">
      {{ label }}
    </label>
    <div class="ps-3 border-start">

      <slot v-if="isExpanded" />
    </div>
  </div>
</template>

<style scoped>
.osim-collapsable-label button {
  border: none;
  padding: 0;
  background: transparent;
}

.osim-collapsable-label :deep(div.osim-static-label),
.osim-collapsable-label :deep(.osim-input) {
  padding-left: 0 !important;
  border-left: none !important;
  margin-left: 0 !important;
}
</style>
