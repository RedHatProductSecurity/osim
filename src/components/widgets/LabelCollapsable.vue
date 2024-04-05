<script setup lang="ts">
import { vRef } from '@/utils/helpers';

const props = withDefaults(
  defineProps<{
    label?: string;
    isExpanded?: boolean | undefined;
    isExpandable?: boolean | undefined;
  }>(),
  {
    isExpandable: true,
    isExpanded: undefined,
    label: '',
  },
);

const isExpanded = vRef(props, 'isExpanded', false);

const emit = defineEmits<{
  setExpanded: [value: boolean];
}>();

const emitToggle = () => emit('setExpanded', !props.isExpanded);
const localToggle = () => (isExpanded.value = !isExpanded.value);

function handleClick() {
  props.isExpanded === undefined ? localToggle() : emitToggle();
}
</script>

<template>
  <div class="osim-collapsable-label" v-bind="$attrs">
    <button
      :disabled="!isExpandable"
      type="button"
      class="me-2"
      :class="{ 'pe-none': !isExpandable }"
      @click="handleClick"
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
.osim-collapsable-label button {
  border: none;
  padding: 0;
  background: transparent;
}

.osim-collapsable-label button * {
  cursor: pointer;
}

.osim-collapsable-label :deep(div.osim-static-label),
.osim-collapsable-label :deep(.osim-input) {
  padding-left: 0 !important;
  border-left: none !important;
  margin-left: 0 !important;
}
</style>
