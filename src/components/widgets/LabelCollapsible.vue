<script setup lang="ts">
withDefaults(
  defineProps<{
    isExpandable?: boolean | undefined;
    isExpanded?: boolean | undefined;
    label?: string;
  }>(),
  {
    isExpandable: true,
    isExpanded: undefined,
    label: '',
  },
);

const emit = defineEmits<{
  toggleExpanded: [];
}>();
</script>

<template>
  <div class="osim-collapsible-label" v-bind="$attrs">
    <button
      :disabled="!isExpandable"
      type="button"
      class="me-2 osim-collapsible-toggle"
      :class="{ 'pe-none': !isExpandable }"
      @click="emit('toggleExpanded')"
    >
      <i v-if="isExpanded" class="bi bi-dash-square-dotted me-1"></i>
      <i v-else class="bi bi-plus-square-dotted me-1"></i>
      <slot name="label">
        <label class="ms-2 form-label">
          {{ label }}
        </label>
      </slot>
    </button>
    <slot name="buttons" />
    <div class="ps-3 border-start">
      <div :class="{ 'visually-hidden': !isExpanded }">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.osim-collapsible-label button {
  border: none;
  padding: 0;
  background: transparent;
}

.osim-collapsible-label button * {
  cursor: pointer;
}

.osim-collapsible-label :deep(div.osim-static-label),
.osim-collapsible-label :deep(.osim-input) {
  padding-left: 0 !important;
  border-left: none !important;
  margin-left: 0 !important;
}
</style>
