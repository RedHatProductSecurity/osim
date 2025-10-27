<script lang="ts" setup>
import { computed } from 'vue';

import type { Column, Table } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import { useDragAndDrop } from '@/composables/useDragAndDrop';

import type { ZodAffectType } from '@/types';
import { useSettingsStore } from '@/stores/SettingsStore';

const props = defineProps<{
  table: Table<ZodAffectType>;
}>();

defineEmits<{
  toggleVisibility: [Column<ZodAffectType, unknown>];
}>();

const { settings } = storeToRefs(useSettingsStore());

const orderedColumns = computed(() => props.table.getAllLeafColumns());

function sortColumns(newOrder: string[]) {
  settings.value.affectsColumnOrder = newOrder;
}

const {
  draggedItem,
  dragOverIndex,
  onDragEnd,
  onDragLeave,
  onDragOver,
  onDragStart,
  onDrop: onDropComposable,
} = useDragAndDrop(sortColumns);

function onDrop(event: DragEvent, targetIndex: number) {
  onDropComposable(event, targetIndex, orderedColumns.value.map(column => column.id));
}
</script>
<template>
  <button
    class="btn btn-secondary dropdown-toggle"
    type="button"
    data-bs-toggle="dropdown"
    data-bs-auto-close="outside"
    aria-expanded="false"
  >
    <i class="bi-gear"></i>
  </button>
  <ul class="dropdown-menu drop-zone">
    <li class="dropdown-item">
      <label class="w-100">
        <input
          v-model="settings.affectsGrouping"
          type="checkbox"
          class="form-check-input"
        >
        Group by PsModule
      </label>
    </li>
    <li class="dropdown-divider"></li>
    <li
      v-for="(column, index) in orderedColumns"
      :key="column.id"
      :class="[
        'dropdown-item',
        'draggable',
        {
          'drop-border-top': dragOverIndex === index && draggedItem !== column.id,
          'drop-border-bottom': dragOverIndex === index + 1 && draggedItem !== column.id
        }
      ]"
      :draggable="column.id.toLowerCase() !== 'select'"
      @dragstart="onDragStart($event, column.id)"
      @dragover="column.id !== 'select' && onDragOver($event, index)"
      @dragleave="onDragLeave"
      @drop="onDrop($event, index)"
      @dragend="onDragEnd"
    >
      <label class="w-100">
        <input
          type="checkbox"
          class="form-check-input"
          :checked="column.getIsVisible()"
          @input="$emit('toggleVisibility', column)"
        >
        {{ typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id }}
      </label>
      <i v-if="column.id.toLowerCase() !== 'select'" class="bi-grip-vertical text-secondary"></i>
    </li>
    <li class="dropdown-item d-flex justify-content-center gap-1 mt-2">
      <button
        type="button"
        title="Reset column order"
        class="btn btn-sm btn-secondary"
        @click="sortColumns([])"
      ><i class="bi-arrow-counterclockwise" /> order</button>
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        title="Reset column sizes"
        @click="table.resetColumnSizing(true)"
      ><i class="bi-arrow-counterclockwise" /> size</button>
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        title="Reset column visibility"
        @click="table.resetColumnVisibility(true)"
      >show all</button>
    </li>
  </ul>
</template>
<style lang="scss" scoped>
.dropdown-menu {
  z-index: 1021; // Bootstrap sticky-header has 1020;
}

.dropdown-item {
  user-select: none;

  &:active {
    background-color: white;
    color: inherit;
  }

  &.drop-border-top {
    border-top: 2px solid #007bff;
  }

  &.drop-border-bottom {
    border-bottom: 2px solid #007bff;
  }

  label,
  i {
    cursor: grab;
  }
}
</style>
