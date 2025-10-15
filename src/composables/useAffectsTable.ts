import { computed, reactive, ref, toRef, type MaybeRef, type Ref } from 'vue';

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedUniqueValues,
  useVueTable,
} from '@tanstack/vue-table';
import type { SortingState, Column, ColumnFiltersState, RowData } from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import columnDefinitions from '@/components/AffectsTable/columnDefinitions';
import { arrIncludesWithBlanks, cvssScore, arrIncludesPartial } from '@/components/AffectsTable/customFilters';

import { useFlaw } from '@/composables/useFlaw';
import { usePagination } from '@/composables/usePagination';
import { useAffectsModel } from '@/composables/useAffectsModel';

import { useSettingsStore } from '@/stores/SettingsStore';
import type { ZodAffectType } from '@/types';

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

function createChangeHandler<T, K extends keyof T>(stateRef: MaybeRef<T>, key?: K) {
  const target = key !== undefined
    ? toRef(stateRef as object & T, key)
    : toRef(stateRef) as Ref<T>;

  return (updaterOrValue: any) => {
    target.value = typeof updaterOrValue === 'function'
      ? updaterOrValue(target.value)
      : updaterOrValue;
  };
}

export function useAffectsTable() {
  const { settings } = storeToRefs(useSettingsStore());

  const {
    actions: { fileTracker, markModified, markNew, markRemoved, refreshData, revertAffect },
    state: { currentAffects, modifiedAffects, newAffects, removedAffects },
  } = useAffectsModel();

  const { flaw } = useFlaw();

  const columns = ref(columnDefinitions());
  const sorting = ref<SortingState>([]);
  const showAll = ref(false);
  const globalFilter = ref('');
  const columnFilters = ref<ColumnFiltersState>([]);

  // Bulk edit state
  const isBulkEditMode = ref(false);
  const bulkEditData = ref<Partial<ZodAffectType>>({});
  const bulkEditChangedFields = ref<Set<keyof ZodAffectType>>(new Set());
  const bulkEditSelectedRowIds = ref<string[]>([]);

  // Virtual row for bulk edit - represents the current bulk edit state
  // This allows enum functions and validations to work correctly
  const bulkEditVirtualRow = computed(() => ({
    original: bulkEditData.value as ZodAffectType,
  }));

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
        for (const trackerToFile of trackersToFile) {
          await fileTracker(trackerToFile)
            .catch(() => {}) // Error is handled by the service, but without a catch handler we stop the loop
            .finally(() => table.options.meta?.filingTracker.delete(trackerToFile.uuid!));
        }
        refreshData();
      },
      filingTracker: reactive(new Set()),
    },
    filterFns: {
      arrIncludesPartial,
      arrIncludesWithBlanks,
      cvssScore,
    },
    onSortingChange: createChangeHandler(sorting),
    onGlobalFilterChange: createChangeHandler(globalFilter),
    onColumnFiltersChange: createChangeHandler(columnFilters),
    onColumnOrderChange: createChangeHandler(settings.value, 'affectsColumnOrder'),
    onColumnVisibilityChange: createChangeHandler(settings.value, 'affectsVisibility'),
    onColumnSizingChange: createChangeHandler(settings.value, 'affectsSizing'),
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

  function fitColumnWidth(column: Column<ZodAffectType>) {
    const HEADER_CHAR_WIDTH = 12; // Bold monospace
    const BODY_CHAR_WIDTH = 9;    // Regular monospace
    const PADDING = 32;

    const headerWidth = (column.columnDef.header?.toString() || '').length * HEADER_CHAR_WIDTH;
    const maxBodyWidth = Math.max(
      0,
      ...column.getFacetedRowModel().flatRows
        .map(row => (row.getValue(column.id)?.toString() || '').length * BODY_CHAR_WIDTH),
    );
    settings.value.affectsSizing[column.id] = Math.max(headerWidth, maxBodyWidth) + PADDING;
  }

  function enterBulkEditMode() {
    // Capture currently selected row IDs
    bulkEditSelectedRowIds.value = table.getSelectedRowModel().flatRows.map(row => row.id);
    // Initialize empty bulk edit data
    bulkEditData.value = {};
    // Clear changed fields tracker
    bulkEditChangedFields.value.clear();
    // Enter bulk edit mode
    isBulkEditMode.value = true;
  }

  function exitBulkEditMode() {
    isBulkEditMode.value = false;
    bulkEditData.value = {};
    bulkEditChangedFields.value.clear();
    bulkEditSelectedRowIds.value = [];
  }

  function updateBulkEditField<K extends keyof ZodAffectType>(field: K, value: ZodAffectType[K]) {
    bulkEditData.value[field] = value;
    bulkEditChangedFields.value.add(field);
  }

  function commitBulkEdits() {
    // Get the table rows that were selected when entering bulk edit mode
    const selectedTableRows = table.getRowModel().flatRows.filter(row =>
      bulkEditSelectedRowIds.value.includes(row.id),
    );

    // Apply only the changed fields to each selected row
    selectedTableRows.forEach((row) => {
      bulkEditChangedFields.value.forEach((fieldName) => {
        const newValue = bulkEditData.value[fieldName];
        const oldValue = row.original[fieldName];

        // Skip update if value hasn't changed
        if (newValue === oldValue) {
          return;
        }

        // Use the table's updateData function to properly update the data
        table.options.meta?.updateData(row.index, fieldName as keyof ZodAffectType, newValue);

        // Trigger onValueChange callback if it exists
        const column = table.getColumn(fieldName);
        const onValueChange = column?.columnDef.meta?.onValueChange;
        if (onValueChange) {
          onValueChange(newValue, row, table);
        }
      });
    });

    // Exit bulk edit mode and clear selection
    exitBulkEditMode();
    table.resetRowSelection();
  }

  return {
    state: {
      table,
      showAll,
      globalFilter,
      columnFilters,
      currentPage,
      pages,
      totalPages,
      currentAffects,
      modifiedAffects,
      newAffects,
      removedAffects,
      isBulkEditMode,
      bulkEditData,
      bulkEditChangedFields,
      bulkEditSelectedRowIds,
      bulkEditVirtualRow,
    },
    actions: {
      changePage,
      changeItemsPerPage,
      toggleColumnVisibility,
      deleteSelectedRows,
      revertAllChanges,
      fileSelectedTrackers,
      fitColumnWidth,
      refreshData,
      enterBulkEditMode,
      exitBulkEditMode,
      updateBulkEditField,
      commitBulkEdits,
    },
  };
}
