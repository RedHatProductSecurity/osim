<script setup lang="ts">
import { onMounted, toRaw, watch } from 'vue';

import { FlexRender } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import PaginationControls from '@/components/AffectsTable/PaginationControls.vue';

import { useFlaw } from '@/composables/useFlaw';
import { useAffectsModel } from '@/composables/useAffectsModel';
import { useAffectsTable } from '@/composables/useAffectsTable';

import { useSettingsStore } from '@/stores/SettingsStore';
import SortIcon from '@/widgets/SortIcon/SortIcon.vue';
import DebouncedInput from '@/widgets/DebouncedInput/DebouncedInput.vue';

import ColumnFilter from './ColumnFilter.vue';
import ColumnOptions from './ColumnOptions.vue';
import BulkEditCell from './BulkEditCell.vue';
import MultiFlawTracker from './MultiFlawTracker.vue';

const { settings } = storeToRefs(useSettingsStore());

const { flaw } = useFlaw();

const {
  actions: { initializeAffects },
  state: { hasChanges, initialAffects },
} = useAffectsModel();
const {
  actions: {
    changeItemsPerPage,
    changePage,
    commitBulkEdits,
    deleteSelectedRows,
    enterBulkEditMode,
    exitBulkEditMode,
    fileSelectedTrackers,
    fitColumnWidth,
    refreshData,
    revertAllChanges,
    selectRelatedTrackers,
    toggleColumnVisibility,
    updateBulkEditField,
  },
  state: {
    bulkEditData,
    bulkEditVirtualRow,
    columnFilters,
    currentAffects,
    currentPage,
    globalFilter,
    isBulkEditMode,
    isFetchingSuggestedTrackers,
    modifiedAffects,
    newAffects,
    pages,
    removedAffects,
    showAll,
    table,
    totalPages,
  },
} = useAffectsTable();

watch(() => initialAffects.value, () => refreshData());

onMounted(() => {
  initializeAffects(toRaw(flaw.value.affects));
});
</script>
<template>
  <div class="mb-2 d-flex justify-content-between align-items-end">
    <div class="d-flex flex-row align-items-end gap-2">
      <PaginationControls
        v-if="currentAffects.length > 0"
        :currentPage
        :pages
        :itemsPerPage="settings.affectsPerPage"
        :totalPages
        :disabled="showAll"
        :totalCount="currentAffects.length"
        :filteredCount="table.getRowCount()"
        @changePage="changePage"
        @changeItemsPerPage="changeItemsPerPage"
        @toggleShowAll="showAll = $event"
      />
    </div>
    <div class="d-flex flex-row gap-2">
      <button
        v-if="(table.getIsSomeRowsSelected() || table.getIsAllRowsSelected())
          && table.getSelectedRowModel().flatRows.filter(row => !row.original.tracker).length"
        class="btn btn-danger text-nowrap"
        type="button"
        title="File trackers for selected affects"
        @click="fileSelectedTrackers()"
      >
        Create trackers
      </button>
      <button
        v-if="!isBulkEditMode && (table.getIsSomeRowsSelected() || table.getIsAllRowsSelected())"
        class="btn btn-primary text-nowrap"
        type="button"
        title="Bulk edit selected affects"
        @click="enterBulkEditMode()"
      >
        <i class="bi-pencil"></i>
        Bulk Edit
      </button>
      <button
        v-if="isBulkEditMode"
        class="btn btn-success text-nowrap"
        type="button"
        title="Apply changes to selected affects"
        @click="commitBulkEdits()"
      >
        <i class="bi-check-lg"></i>
        Apply Changes
      </button>
      <button
        v-if="isBulkEditMode"
        class="btn btn-secondary text-nowrap"
        type="button"
        title="Cancel bulk edit"
        @click="exitBulkEditMode()"
      >
        <i class="bi-x-lg"></i>
        Cancel
      </button>
      <button
        v-if="!isBulkEditMode && (table.getIsSomeRowsSelected() || table.getIsAllRowsSelected())"
        class="btn btn-danger"
        type="button"
        title="Remove selected affects"
        @click="deleteSelectedRows()"
      >
        <i class="bi-trash"></i>
      </button>
      <button
        v-if="hasChanges"
        class="btn btn-danger"
        type="button"
        title="Revert ALL changes"
        @click="revertAllChanges()"
      >
        <i class="bi-arrow-counterclockwise"></i>
      </button>
      <button
        v-if="columnFilters.length"
        class="btn btn-light btn-sm text-nowrap border border-secondary"
        type="button"
        @click="columnFilters = []"
      >
        <i class="bi-x"></i>
        Clear column filters
      </button>
      <DebouncedInput
        v-if="currentAffects.length >0"
        v-model="globalFilter"
        class="form-control"
        type="text"
        placeholder="Search..."
      />
      <MultiFlawTracker
        v-if="currentAffects.length > 0"
      />
      <button
        v-if="currentAffects.length > 0"
        v-osim-loading="isFetchingSuggestedTrackers"
        :disabled="isFetchingSuggestedTrackers"
        class="btn btn-secondary text-nowrap"
        type="button"
        title="Select suggested trackers"
        @click="selectRelatedTrackers()"
      >
        <i v-if="!isFetchingSuggestedTrackers" class="bi-ui-checks-grid"></i>
      </button>
      <button
        class="btn btn-secondary text-nowrap"
        title="Add new affect"
        type="button"
        @click="table.options.meta?.createData()"
      >
        <i class="bi-plus-lg" />
      </button>
      <ColumnOptions
        :table
        @toggleVisibility="toggleColumnVisibility"
      />
    </div>
  </div>
  <div class="table-responsive">
    <table v-if="currentAffects.length > 0" class="table table-striped mb-0 z-0">
      <thead class="sticky-top table-dark">
        <tr
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
        >
          <th
            v-for="header in headerGroup.headers"
            :key="header.id"
            :colspan="header.colSpan"
            :class="[
              header.column.getCanSort() ? 'sortable' : '',
              header.id === 'actions' ? 'sticky-actions' : ''
            ]"
            :style="{ width: `${header.getSize()}px` }"
            @click="header.column.getToggleSortingHandler()?.($event)"
          >
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
            <ColumnFilter
              v-if="!header.isPlaceholder && header.column.getCanFilter()"
              class="px-1"
              :column="header.column"
            />
            <SortIcon
              v-if="!header.isPlaceholder && header.column.getCanSort()"
              class="sort-icon"
              :direction="header.column.getIsSorted()"
            />
            <div
              v-if="header.column.getCanResize()"
              class="resizer"
              :class="[table.options.columnResizeDirection, header.column.getIsResizing() ? 'isResizing' : '']"
              @mousedown="$event => header.getResizeHandler()($event)"
              @touchstart="$event => header.getResizeHandler()($event)"
              @dblclick="fitColumnWidth(header.column)"
              @click.stop
            >
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Bulk Edit Row -->
        <tr v-if="isBulkEditMode" class="bulk-edit">
          <td
            v-for="header in table.getHeaderGroups()[0].headers"
            :key="header.id"
            :class="header.id === 'actions' ? 'sticky-actions' : ''"
            :style="{ width: `${header.getSize()}px` }"
          >
            <div v-if="header.id === 'Select'" class="d-flex align-items-center gap-1">
              <i class="bi-pencil-square text-primary"></i>
            </div>
            <BulkEditCell
              v-else
              :column="header.column"
              :modelValue="bulkEditData[header.id as keyof typeof bulkEditData]"
              :virtualRow="bulkEditVirtualRow"
              @fieldChanged="(columnId, value) => updateBulkEditField(columnId as any, value)"
            />
          </td>
        </tr>
        <!-- Normal Rows -->
        <tr
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          :class="{
            'modified': modifiedAffects.has(row.id),
            'new': newAffects.has(row.id),
            'removed': removedAffects.has(row.id),
            'disabled': table.options.meta?.filingTracker.has(row.id)
          }"
        >
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            :class="cell.column.id === 'actions' ? 'sticky-actions' : ''"
          >
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </td>
        </tr>
        <tr v-if="table.getRowCount()=== 0">
          <td :colspan="table.getVisibleFlatColumns().length">No affects found for current filters</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="my-2 ms-2">
      This Flaw does not have affects
    </div>
  </div>
</template>
<style lang="scss" scoped>
.sort-icon {
  position: absolute;
  right: 1rem;
  bottom: 50%;
  translate: 0 50%;
}

table {
  border-collapse: separate;
  table-layout: fixed;

  th {
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    box-sizing: content-box;

    .resizer {
      background-color: rgb(var(--bs-secondary-rgb));
      user-select: none;
      touch-action: none;
    }

    &.sortable {
      cursor: pointer;
      user-select: none;
      padding-right: 28px;
    }
  }

  tr {
    td {
      &,
      span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      transition:
        background-color 0.5s,
        color 0.5s,
        border-color 0.25s;
      padding-block: 0.2rem;
      border-block: 0.2ch solid #e0e0e0;
      background-color: #e0e0e0;
    }

    &:hover td {
      border-color: #707070bf;
    }

    &.modified td {
      border-color: var(--bs-light-green) !important;
      background-color: var(--bs-light-green);
      color: #204d00;
    }

    &.new td {
      border-color: #e0f0ff !important;
      background-color: #e0f0ff;
      color: #036;
    }

    &.removed td {
      border-color: #ffe3d9 !important;
      background-color: #ffe3d9;
      color: #731f00;
    }

    &.disabled td {
      border-color: #adadad;
      background-color: #adadad;
      cursor: progress;
    }

    &.bulk-edit td {
      border-color: #e0d4ff !important;
      background-color: #f0e8ff;
      color: #4a148c;
      font-weight: 500;
    }
  }

  tbody {
    tr {
      height: 2.5rem;
    }
  }

  // Sticky actions column
  th.sticky-actions,
  td.sticky-actions {
    position: sticky;
    right: 0;
    z-index: 1;
    box-shadow: -2px 0 4px rgb(0 0 0 / 20%);
  }

  thead th.sticky-actions {
    z-index: 3;
  }
}
</style>
