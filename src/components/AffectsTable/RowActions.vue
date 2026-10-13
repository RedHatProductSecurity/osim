<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import type { Row, Table } from '@tanstack/vue-table';

import { useAffectsModel } from '@/composables/useAffectsModel';
import { useFlaw } from '@/composables/useFlaw';

import { osimRuntime } from '@/stores/osimRuntime';
import type { ZodAffectType } from '@/types';

import LinkExistingTracker from './LinkExistingTracker.vue';

const props = defineProps<{
  row: Row<ZodAffectType>;
  table: Table<ZodAffectType>;
}>();

const {
  state: { modifiedAffects, newAffects, removedAffects },
} = useAffectsModel();

const tableMeta = props.table.options.meta;
const { flaw } = useFlaw();
const linkButton = ref<HTMLButtonElement>();
const removeButton = ref<HTMLButtonElement>();
const showLinkDialog = ref(false);
const isModified = computed(() => modifiedAffects.has(props.row.id));
const isRemoved = computed(() => removedAffects.has(props.row.id));
const isNew = computed(() => newAffects.has(props.row.id));
const isFilingTracker = computed(() => tableMeta?.filingTracker.has(props.row.id));
const isTrackerUnavailable = computed(() => tableMeta?.unavailableTrackers.has(props.row.original.uuid!));
const canFileTracker = computed(() =>
  !osimRuntime.value.readOnly
  && !isNew.value && !isModified.value && !isRemoved.value
  && !props.row.original.tracker
  && !isTrackerUnavailable.value,
);
const canLinkTracker = computed(() =>
  !osimRuntime.value.readOnly
  && !!props.row.original.uuid
  && !isNew.value && !isModified.value && !isRemoved.value
  && !props.row.original.tracker,
);

function deleteRow() {
  tableMeta?.deleteData(props.row.id);
}

function revertRow() {
  tableMeta?.revert(props.row.id);
}

function fileTracker() {
  tableMeta?.fileTrackers(props.row.original);
}

function closeLinkDialog() {
  showLinkDialog.value = false;
  nextTick(() => (linkButton.value ?? removeButton.value)?.focus());
}
</script>
<template>
  <div class="btn-group">
    <button
      ref="removeButton"
      title="Remove affect"
      type="button"
      :disabled="isFilingTracker"
      class="btn btn-dark btn-sm"
      @click="deleteRow()"
    ><i class="bi-trash"></i></button>
    <button
      v-if="!isNew && (isModified || isRemoved)"
      type="button"
      title="Revert changes"
      class="btn btn-dark btn-sm"
      :disabled="isFilingTracker"
      @click="revertRow()"
    ><i class="bi-arrow-counterclockwise"></i></button>
    <button
      v-if="canFileTracker"
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
    <button
      v-if="canLinkTracker"
      ref="linkButton"
      type="button"
      title="Link existing tracker"
      aria-label="Link existing tracker"
      class="btn btn-dark btn-sm"
      :disabled="isFilingTracker"
      @click="showLinkDialog = true"
    ><i class="bi-link-45deg" /></button>
    <button
      v-if="isTrackerUnavailable"
      type="button"
      title="Tracker not available"
      class="btn btn-warning btn-sm"
    ><i
      class="bi-exclamation-triangle"
    /></button>
    <LinkExistingTracker
      v-if="showLinkDialog"
      :affect="row.original"
      :flawUuid="flaw.uuid"
      :rowId="row.id"
      :table
      @close="closeLinkDialog"
    />
  </div>
</template>
