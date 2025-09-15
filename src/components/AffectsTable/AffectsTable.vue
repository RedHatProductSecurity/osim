<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue';

import {
  FlexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedUniqueValues,
  useVueTable,
} from '@tanstack/vue-table';
import type { SortingState, Column, ColumnFiltersState, RowData } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import PaginationControls from '@/components/AffectsTable/PaginationControls.vue';

import { useFlaw } from '@/composables/useFlaw';
import { usePagination } from '@/composables/usePagination';
import { useAffectsModel } from '@/composables/useAffectsModel';

import { useSettingsStore } from '@/stores/SettingsStore';
import SortIcon from '@/widgets/SortIcon/SortIcon.vue';
import DebouncedInput from '@/widgets/DebouncedInput/DebouncedInput.vue';
import type { ZodAffectType } from '@/types';

import columnDefinitions from './columnDefinitions';
import ColumnFilter from './ColumnFilter.vue';
import { arrIncludesWithBlanks, cvssScore } from './customFilters';
import ColumnOptions from './ColumnOptions.vue';

declare module '@tanstack/table-core' {

  interface TableMeta<TData extends RowData> {
    createData(): void;
    deleteData(rowId: string | string[]): void;
    fileTrackers(rows: TData | TData[]): Promise<void>;
    filingTracker: Set<string>;
    revert(rowId: string): void;
    updateData<T extends keyof ZodAffectType>(rowIndex: number, columnId: T, value: ZodAffectType[T]): void;
  }
}

const { settings } = storeToRefs(useSettingsStore());

const {
  actions: { fileTracker, initializeAffects, markModified, markNew, markRemoved, refreshData, revertAffect },
  state: { currentAffects, hasChanges, initialAffects, modifiedAffects, newAffects, removedAffects },
} = useAffectsModel();

const { flaw } = useFlaw();
const columns = ref(columnDefinitions());
const sorting = ref<SortingState>([]);
const showAll = ref(false);
const globalFilter = ref('');
const columnFilters = ref<ColumnFiltersState>([]);
const totalPages = computed(() =>
  Math.ceil((currentAffects.value.length || 0) / settings.value.affectsPerPage),
);
const { changePage, currentPage, pages } = usePagination(totalPages);
const pagination = computed(() => ({
  pageIndex: showAll.value ? 0 : currentPage.value - 1,
  pageSize: showAll.value ? currentAffects.value.length : settings.value.affectsPerPage,
}));
const table = useVueTable({
  get data() { return currentAffects.value; },
  get columns() { return columns.value; },
  getRowId: row => (row?._uuid || row?.uuid) ?? '',
  columnResizeMode: 'onChange',
  columnResizeDirection: 'ltr',
  initialState: {
    columnSizing: settings.value.affectsSizing,
  },
  state: {
    get columnVisibility() { return settings.value.affectsVisibility; },
    get pagination() { return pagination.value; },
    get sorting() { return sorting.value; },
    get globalFilter() { return globalFilter.value; },
    get columnFilters() { return columnFilters.value; },
    get columnOrder() { return settings.value.affectsColumnOrder; },
    get columnSizing() { return settings.value.affectsSizing; },
  },
  meta: {
    createData: () => {
      const uuid = crypto.randomUUID();
      markNew(uuid);
      currentAffects.value = [{
        _uuid: uuid,
        flaw: flaw.value.uuid,
        ps_module: '',
        ps_component: '',
        ps_update_stream: '',
        embargoed: flaw.value.embargoed,
        alerts: [],
        trackers: [],
        cvss_scores: [],
        tracker: null,
      }, ...currentAffects.value];
    },
    updateData: (rowIndex, columnId, value) => {
      const currentAffect = currentAffects.value[rowIndex];
      currentAffect[columnId] = value;
      markModified((currentAffect._uuid || currentAffect.uuid)!);
      refreshData();
    },
    deleteData: (rowId) => {
      if (!Array.isArray(rowId)) rowId = [rowId];
      rowId.forEach(row => markRemoved(row));
    },
    revert: (rowId) => {
      revertAffect(rowId);
      refreshData();
    },
    fileTrackers: async (rows) => {
      if (!Array.isArray(rows)) rows = [rows];

      // Filter out already filing trackers
      const trackersToFile = rows.filter(row => row.uuid && !table.options.meta?.filingTracker.has(row.uuid));

      trackersToFile.forEach(({ uuid }) => table.options.meta?.filingTracker.add(uuid!));
      try {
        for (const trackerToFile of trackersToFile) {
          await fileTracker(trackerToFile);
          table.options.meta?.filingTracker.delete(trackerToFile.uuid!);
        }
      } finally {
        refreshData();
      }
    },
    filingTracker: reactive(new Set()),
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(sorting.value)
        : updaterOrValue;
  },
  onGlobalFilterChange: (updaterOrValue) => {
    globalFilter.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(globalFilter.value)
        : updaterOrValue;
  },
  onColumnFiltersChange: (updaterOrValue) => {
    columnFilters.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(columnFilters.value)
        : updaterOrValue;
  },
  onColumnOrderChange: (updaterOrValue) => {
    settings.value.affectsColumnOrder = typeof updaterOrValue === 'function'
      ? updaterOrValue(settings.value.affectsColumnOrder)
      : updaterOrValue;
  },
  onColumnVisibilityChange: (updaterOrValue) => {
    settings.value.affectsVisibility = typeof updaterOrValue === 'function'
      ? updaterOrValue(settings.value.affectsVisibility)
      : updaterOrValue;
  },
  onColumnSizingChange: (updaterOrValue) => {
    settings.value.affectsSizing = typeof updaterOrValue === 'function'
      ? updaterOrValue(settings.value.affectsSizing)
      : updaterOrValue;
  },
  filterFns: {
    arrIncludesWithBlanks,
    cvssScore,
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
});

function toggleColumnVisibility(column: Column<any, any>) {
  settings.value.affectsVisibility = {
    ...settings.value.affectsVisibility,
    [column.id]: !column.getIsVisible(),
  };

  // Toggle global filtering based on column visibility
  if (column.columnDef.meta?.filter !== false) {
    column.columnDef.enableGlobalFilter = !column.getCanGlobalFilter();
  }
}

function changeItemsPerPage(itemsCount: number) {
  if (Number.isNaN(itemsCount)) {
    itemsCount = 10;
  }
  settings.value.affectsPerPage = Math.max(1, Math.min(100, itemsCount));
}

function deleteSelectedRows() {
  table.options.meta?.deleteData(table.getSelectedRowModel().flatRows.map(row => row.id));
  table.resetRowSelection();
}

function revertAllChanges() {
  currentAffects.value.forEach(({ _uuid, uuid }) => revertAffect((_uuid || uuid)!));
  refreshData();
}

async function fileSelectedTrackers() {
  const affectsWithoutTracker = table.getSelectedRowModel().flatRows
    .filter(row => !row.original.tracker)
    .map(row => row.original);
  await table.options.meta?.fileTrackers(affectsWithoutTracker);
}

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
        v-if="table.getIsSomeRowsSelected() || table.getIsAllRowsSelected()"
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
            :class="header.column.getCanSort() ? 'sortable' : ''"
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
              class="resizer"
              :class="[table.options.columnResizeDirection, header.column.getIsResizing() ? 'isResizing' : '']"
              @mousedown="$event => header.getResizeHandler()($event)"
              @touchstart="$event => header.getResizeHandler()($event)"
              @dblclick="header.column.resetSize()"
              @click.stop
            >
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          :class="{
            'modified': modifiedAffects.has(row.id),
            'new': newAffects.has(row.id),
            'removed': removedAffects.has(row.id),
          }"
        >
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
          >
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </td>
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
  }

  tbody {
    tr {
      height: 2.5rem;
    }
  }
}
</style>
