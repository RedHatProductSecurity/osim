<script lang="ts" setup>
import { computed } from 'vue';

import type { Row, Table } from '@tanstack/vue-table';

import { useAffectsModel } from '@/composables/useAffectsModel';

import type { ZodAffectType } from '@/types';

const props = defineProps<{
  row: Row<ZodAffectType>;
  table: Table<ZodAffectType>;
}>();

const {
  state: { modifiedAffects, newAffects, removedAffects },
} = useAffectsModel();

const tableMeta = props.table.options.meta;
const isModified = computed(() => modifiedAffects.has(props.row.id));
const isRemoved = computed(() => removedAffects.has(props.row.id));
const isNew = computed(() => newAffects.has(props.row.id));
const isFilingTracker = computed(() => tableMeta?.filingTracker.has(props.row.id));

function deleteRow() {
  tableMeta?.deleteData(props.row.id);
}

function revertRow() {
  tableMeta?.revert(props.row.id);
}

function fileTracker() {
  tableMeta?.fileTrackers(props.row.original);
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
      v-if="!isNew && (isModified || isRemoved)"
      type="button"
      title="Revert changes"
      class="btn btn-dark btn-sm"
      @click="revertRow()"
    ><i class="bi-arrow-counterclockwise"></i></button>
    <button
      v-if="(!isNew && !isModified && !isRemoved) && !row.original.tracker"
      v-osim-loading="isFilingTracker"
      type="button"
      title="File tracker"
      class="btn btn-dark btn-sm"
      :disabled="isFilingTracker"
      @click="fileTracker()"
    ><i
      v-if="!isFilingTracker"
      class="bi-file-earmark-diff"
    /></button>
  </div>
</template>
