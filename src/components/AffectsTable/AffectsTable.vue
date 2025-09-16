<script setup lang="ts">
import { computed, ref, toRaw } from 'vue';

import {
  FlexRender, getCoreRowModel, getPaginationRowModel,
  getSortedRowModel, type SortingState, useVueTable, type Column,
} from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import PaginationControls from '@/components/AffectsTable/PaginationControls.vue';

import { useFlaw } from '@/composables/useFlaw';
import { usePagination } from '@/composables/usePagination';

import { useSettingsStore } from '@/stores/SettingsStore';
import SortIcon from '@/widgets/SortIcon/SortIcon.vue';

import columnDefinitions from './columnDefinitions';

const { settings } = storeToRefs(useSettingsStore());

const { flaw } = useFlaw();
const data = ref(structuredClone(toRaw(flaw.value.affects)));
const columns = ref(columnDefinitions());
const sorting = ref<SortingState>([]);

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
      return {
        pageIndex: currentPage.value - 1,
        pageSize: settings.value.affectsPerPage,
      };
    },
    get sorting() {
      return sorting.value;
    },
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value = typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue;
  },
  onStateChange: () => {
    settings.value.affectsSizing = table.getAllLeafColumns()
      .reduce((acc, cur) => ({ ...acc, [cur.id]: cur.getSize() }), {});
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
});

function toggleColumnVisibility(column: Column<any, any>) {
  settings.value.affectsVisibility = {
    ...settings.value.affectsVisibility,
    [column.id]: !column.getIsVisible(),
  };
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
    <div>
      <PaginationControls
        :currentPage
        :pages
        :itemsPerPage="settings.affectsPerPage"
        :totalPages
        @changePage="changePage"
        @changeItemsPerPage="changeItemsPerPage"
      />
    </div>
    <div>
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
    <table
      class="table table-striped mb-0"
      :style="{ width: `${table.getCenterTotalSize()}px` }"
    >
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
            <SortIcon
              v-if="header.column.getCanSort()"
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
