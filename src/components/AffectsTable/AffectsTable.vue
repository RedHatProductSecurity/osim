<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';

import {
  FlexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedUniqueValues,
  useVueTable,
} from '@tanstack/vue-table';
import type { SortingState, Column, ColumnFiltersState } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import PaginationControls from '@/components/AffectsTable/PaginationControls.vue';

import { useFlaw } from '@/composables/useFlaw';
import { usePagination } from '@/composables/usePagination';

import { useSettingsStore } from '@/stores/SettingsStore';
import SortIcon from '@/widgets/SortIcon/SortIcon.vue';
import DebouncedInput from '@/widgets/DebouncedInput/DebouncedInput.vue';

import columnDefinitions from './columnDefinitions';
import ColumnFilter from './ColumnFilter.vue';
import { arrIncludesWithBlanks } from './customFilters';

const { settings } = storeToRefs(useSettingsStore());

const { flaw } = useFlaw();
const data = ref(structuredClone(toRaw(flaw.value.affects)));
const columns = ref(columnDefinitions());
const sorting = ref<SortingState>([]);
const showAll = ref(false);
const globalFilter = ref('');
const columnFilters = ref<ColumnFiltersState>([]);
const totalPages = computed(() =>
  Math.ceil((data.value.length || 0) / settings.value.affectsPerPage),
);
const { changePage, currentPage, pages } = usePagination(totalPages);

const table = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  columnResizeMode: 'onChange',
  columnResizeDirection: 'ltr',
  initialState: {
    columnSizing: settings.value.affectsSizing,
  },
  state: {
    get columnVisibility() {
      return settings.value.affectsVisibility;
    },
    get pagination() {
      return showAll.value
        ? {
            pageIndex: 0,
            pageSize: data.value.length,
          }
        : {
            pageIndex: currentPage.value - 1,
            pageSize: settings.value.affectsPerPage,
          };
    },
    get sorting() {
      return sorting.value;
    },
    get globalFilter() {
      return globalFilter.value;
    },

    get columnFilters() {
      return columnFilters.value;
    },
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
  onStateChange: () => {
    settings.value.affectsSizing = table.getAllLeafColumns()
      .reduce((acc, cur) => ({ ...acc, [cur.id]: cur.getSize() }), {});
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
</script>
<template>
  <h4>Affected Offerings</h4>
  <div class="mb-2 d-flex justify-content-between align-items-end">
    <div class="d-flex flex-row align-items-end gap-2">
      <PaginationControls
        :currentPage
        :pages
        :itemsPerPage="settings.affectsPerPage"
        :totalPages
        :disabled="showAll"
        :totalCount="data.length"
        :filteredCount="table.getRowCount()"
        @changePage="changePage"
        @changeItemsPerPage="changeItemsPerPage"
        @toggleShowAll="showAll = $event"
      />
    </div>
    <div class="d-flex flex-row gap-2">
      <button
        v-if="columnFilters.length"
        class="btn btn-light btn-sm text-nowrap border border-secondary"
        @click="columnFilters = []"
      >
        <i class="bi-x"></i>
        Clear column filters
      </button>
      <DebouncedInput
        v-model="globalFilter"
        class="form-control"
        type="text"
        placeholder="Search..."
      />
      <button
        class="btn btn-secondary dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
        data-bs-auto-close="outside"
        aria-expanded="false"
      >
        <i class="bi-gear"></i>
      </button>
      <ul class="dropdown-menu">
        <li
          v-for="column in table.getAllLeafColumns()"
          :key="column.id"
          class="dropdown-item"
        >
          <label>
            <input
              type="checkbox"
              :checked="column.getIsVisible()"
              @input="toggleColumnVisibility(column)"
            >
            {{ typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id }}
          </label>
        </li>
      </ul>
    </div>
  </div>
  <div class="table-responsive">
    <table class="table table-striped mb-0 z-0">
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
  </div>
</template>
<style lang="scss" scoped>
.dropdown-menu {
  z-index: 1021; // Bootstrap sticky-header has 1020;
}

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
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
  }
}
</style>
