<script setup lang="ts">

type Props = {
  label?: string;
};

defineProps<Props>();
const isExpanded = defineModel<boolean>();


</script>

<template>
  <div class="osim-collapsable-label mb-3 ps-">
    <button type="button" class="me-2" @click="isExpanded = !isExpanded">
      <i v-if="isExpanded" class="bi bi-dash-square-dotted me-1"></i>
      <i v-else class="bi bi-plus-square-dotted me-1"></i>
      <slot name="label">
        <label class="ms-2 form-label">
          {{ label }}
        </label>
      </slot>
    </button>
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
