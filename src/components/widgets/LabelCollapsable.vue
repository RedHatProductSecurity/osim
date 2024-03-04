<script setup lang="ts">
import { ref } from 'vue';
const props = withDefaults(
  defineProps<{
    label?: string;
    isExpanded?: boolean | null;
  }>(),
  {
    isExpanded: null,
    label: '',
  },
);

const isExpandedLocal = ref(false);
const emit = defineEmits<{
  toggleExpanded: [value: boolean];
}>();

function handleClick() {
  console.log(props.isExpanded);
  if (props.isExpanded !== null) {
    emit('toggleExpanded', !props.isExpanded);
  } else {
    isExpandedLocal.value = !isExpandedLocal.value;
  }
}
</script>

<template>
  <div class="osim-collapsable-label" v-bind="$attrs">
    <button type="button" class="me-2" @click="handleClick">
      <i v-if="isExpanded || isExpandedLocal" class="bi bi-dash-square-dotted me-1"></i>
      <i v-else class="bi bi-plus-square-dotted me-1"></i>
      <slot name="label">
        <label class="ms-2 form-label">
          {{ label }}
        </label>
      </slot>
    </button>
    <slot name="buttons" />
    <div class="ps-3 border-start">
      <div :class="{ 'visually-hidden': !(isExpanded || isExpandedLocal) }">
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
