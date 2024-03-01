<script setup lang="ts">
const props = defineProps<{
  label?: string;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  'toggleExpanded': [value: boolean],
}>();

function handleClick() {
  emit('toggleExpanded', !props.isExpanded);
}
</script>

<template>
  <div class="osim-collapsable-label" v-bind="$attrs">
    <button type="button" class="me-2" @click="handleClick">
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
