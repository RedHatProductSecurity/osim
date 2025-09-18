<script lang="ts" setup>
import { computed } from 'vue';

import type { Row, Table } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';

const props = defineProps<{
  row: Row<ZodAffectType>;
  table: Table<ZodAffectType>;
}>();

const tableMeta = props.table.options.meta;
const isModified = computed(() => tableMeta?.modifiedRows.includes(props.row.id));
const isRemoved = computed(() => tableMeta?.removedRows.includes(props.row.id));

function deleteRow() {
  tableMeta?.deleteData(props.row.id);
}

function revertRow() {
  tableMeta?.revert(props.row.id);
}
</script>
<template>
  <div class="btn-group">
    <button
      title="Remove affect"
      type="button"
      class="btn btn-dark btn-sm"
      @click="deleteRow()"
    ><i class="bi-trash"></i></button>
    <button
      v-if="isModified || isRemoved"
      type="button"
      title="Revert changes"
      class="btn btn-dark btn-sm"
      @click="revertRow()"
    ><i class="bi-arrow-counterclockwise"></i></button>
  </div>
</template>
