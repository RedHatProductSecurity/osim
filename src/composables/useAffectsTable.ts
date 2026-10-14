import { computed, reactive, ref, toRef, watch, type MaybeRef, type Ref } from 'vue';

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedUniqueValues,
  useVueTable,
  getExpandedRowModel,
  type RowPinningState,
  type SortingState,
  type Column,
  type ColumnFiltersState,
  type RowData,
} from '@tanstack/vue-table';
import { storeToRefs } from 'pinia';

import columnDefinitions from '@/components/AffectsTable/columnDefinitions';
import { arrIncludesPartial, arrIncludesWithBlanks, cvssScore } from '@/components/AffectsTable/customFilters';

import { useFlaw } from '@/composables/useFlaw';
import { usePagination } from '@/composables/usePagination';
import { useAffectsModel } from '@/composables/useAffectsModel';
import { useMultiFlawTrackers } from '@/composables/useMultiFlawTrackers';
import { showSuccessToast } from '@/composables/service-helpers';

import { useSettingsStore } from '@/stores/SettingsStore';
import { useToastStore } from '@/stores/ToastStore';
import { getTrackersForFlaws } from '@/services/TrackerService';
import {
  closeJiraIssue, getCloseTransition, getJiraTransitions, type JiraCloseChoice, type JiraTransition,
} from '@/services/JiraService';
import { getTrackerAutomanagerStatus, type TrackerAutomanagerRecordType } from '@/services/TrackerAutomanagerService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { TrackerSuggestions, ZodAffectType } from '@/types/zodAffect';
import { affectUUID } from '@/utils/helpers';

declare module '@tanstack/table-core' {

  interface TableMeta<TData extends RowData> {
    createData(): void;
    deleteData(rowId: string | string[]): void;
    fileTrackers(rows: TData | TData[]): Promise<void>;
    filingTracker: Set<string>;
    relatedAffects: Map<string, 'error' | 'loading' | ZodAffectType[]>;
    revert(rowId: string): void;
    unavailableTrackers: Set<string>;
    updateData<T extends keyof ZodAffectType>(
      rowIndex: number,
      columnId: T,
      value: ZodAffectType[T],
      parentIndex?: number
    ): void;
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

function jiraError(error: any): string {
  const data = error?.response?.data ?? error?.data;
  const details = [...(data?.errorMessages ?? []), ...Object.values(data?.errors ?? {})].join('; ');
  if (details) return details;
  if (error?.response?.status) {
    const status = error.response.statusText ? ` ${error.response.statusText}` : '';
    return `Jira returned HTTP ${error.response.status}${status}.`;
  }
  return error?.message || (typeof error === 'string' ? error : 'Could not reach Jira. Check your connection.');
}

export function useAffectsTable(
  onRefreshFlaw?: () => void,
  onFailedSelection?: (failed: Set<string>) => void,
) {
  const { settings } = storeToRefs(useSettingsStore());

  const {
    actions: { fileTracker, markModified, markNew, markRemoved, refreshData, revertAffect },
    state: { affectUUIDMap, currentAffects, modifiedAffects, newAffects, removedAffects },
  } = useAffectsModel();

  const {
    actions: { getAffectUuidsForStream },
    state: { relatedAffects },
  } = useMultiFlawTrackers();

  // groupedAffects is a representation of the currentAffects grouped by ps_module,
  // all the logic still depends on currentAffects to work, this is used only
  // by the table to group/expand the rows
  const groupedAffects = computed(() => {
    // Separate new affects from existing affects
    const newAffectsList: ({ rows: ZodAffectType[] } & ZodAffectType)[] = [];
    const groups = new Map<string, ZodAffectType[]>();

    for (const affect of currentAffects.value) {
      const id = affectUUID(affect) ?? '';
      if (newAffects.has(id)) {
        // New affects are always individual parent rows
        const parent = { ...affect, rows: [] };
        newAffectsList.push(parent);
      } else {
        // Group existing affects by ps_module
        const module = affect.ps_module ?? '';
        let group = groups.get(module);
        if (!group) {
          group = [];
          groups.set(module, group);
        }
        group.push(affect);
      }
    }

    // Select first element in group as parent
    const groupedExisting: ({ rows: ZodAffectType[] } & ZodAffectType)[] = [];
    for (const group of groups.values()) {
      const parent = { ...group[0], rows: group.length > 1 ? group.slice(1) : [] };
      groupedExisting.push(parent);
    }
    // Return new affects first, then grouped existing affects
    return newAffectsList.concat(groupedExisting);
  });

  const { flaw } = useFlaw();
  const trackerStatusLoaded = ref(false);
  const trackerStatusError = ref(false);
  const trackerIdentity = new Map<string, Pick<ZodAffectType, 'ps_component' | 'ps_module' | 'ps_update_stream'>>();
  const trackerMatches = new Map<string, TrackerAutomanagerRecordType>();
  const trackerStatusRefresh = ref(0);
  watch([() => flaw.value.uuid, trackerStatusRefresh], async ([flawUuid], _old, onCleanup) => {
    trackerStatusLoaded.value = false;
    trackerStatusError.value = false;
    trackerIdentity.clear();
    trackerMatches.clear();
    currentAffects.value = [...currentAffects.value];
    if (!flawUuid) return;
    if (!osimRuntime.value.backends.trackerAutomanager) {
      trackerStatusLoaded.value = true;
      return;
    }
    for (const affect of flaw.value.affects) {
      if (affect.uuid) trackerIdentity.set(affect.uuid, {
        ps_update_stream: affect.ps_update_stream,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
      });
    }

    const controller = new AbortController();
    onCleanup(() => controller.abort());
    try {
      const result = await getTrackerAutomanagerStatus(flawUuid, controller.signal);
      if (controller.signal.aborted) return;
      if (result.flaw_uuid !== flawUuid) throw new Error('Unexpected flaw in tracker status response.');
      for (const [uuid, identity] of trackerIdentity) {
        const match = result.trackers.find(record => record.ps_update_stream === identity.ps_update_stream
          && record.ps_module === identity.ps_module && record.ps_component === identity.ps_component);
        if (match) trackerMatches.set(uuid, match);
      }
      trackerStatusLoaded.value = true;
      currentAffects.value = [...currentAffects.value];
    } catch {
      if (controller.signal.aborted) return;
      trackerStatusError.value = true;
      trackerStatusLoaded.value = true;
      currentAffects.value = [...currentAffects.value];
    }
  }, { immediate: true, flush: 'post' });

  function trackerDisplayValue(affect: ZodAffectType) {
    if (affect.tracker?.external_system_id) return affect.tracker.external_system_id;
    if (!affect.uuid || newAffects.has(affectUUID(affect) ?? '')) return '';
    if (!trackerStatusLoaded.value) return '';
    if (trackerStatusError.value) return 'Failed';
    if (!osimRuntime.value.backends.trackerAutomanager) return 'none';
    if (affect.tracker) return 'In Progress';
    const match = trackerMatches.get(affect.uuid);
    return match?.status === 'failed' ? 'Failed' : match ? 'In Progress' : 'none';
  }

  const columns = ref(columnDefinitions(
    trackerDisplayValue,
    affect => !!affect.uuid && !trackerStatusLoaded.value && !affect.tracker?.external_system_id,
    affect => affect.uuid && trackerMatches.get(affect.uuid)?.status === 'failed'
      ? trackerMatches.get(affect.uuid)?.failure_reason ?? null
      : null,
    affect => trackerStatusError.value && !affect.tracker?.external_system_id,
  ));
  const sorting = ref<SortingState>([]);
  const showAll = ref(false);
  const globalFilter = ref('');
  const columnFilters = ref<ColumnFiltersState>([]);
  const isFetchingSuggestedTrackers = ref(false);
  const expandedRows = ref({});

  const totalPages = computed(() => {
    const affectCount = settings.value.affectsGrouping
      ? groupedAffects.value.length
      : currentAffects.value.length;
    return Math.ceil(affectCount / settings.value.affectsPerPage);
  });
  // Bulk edit state
  const isBulkEditMode = ref(false);
  const bulkEditData = ref<Partial<ZodAffectType>>({});
  const bulkEditChangedFields = ref<Set<keyof ZodAffectType>>(new Set());
  const bulkEditSelectedRowIds = ref<string[]>([]);
  const isClosingTrackers = ref(false);
  const isDiscoveringClose = ref(false);
  let discoveryRun = 0;
  const showCloseDialog = ref(false);
  const closeErrors = ref<string[]>([]);
  const closeTransitions = ref<Record<string, JiraTransition>>({});
  const closeResolutions = ref<Array<{ id: string; name: string }>>([]);
  const closeVexOptions = ref<Array<{ id: string; name: string }>>([]);
  const closeRequiresVex = ref(false);
  const closeChoice = ref<JiraCloseChoice>({ resolution: '' });
  const closeRows = ref<Array<{ id: string; key: string }>>([]);

  // Virtual row for bulk edit - represents the current bulk edit state
  // This allows enum functions and validations to work correctly
  const bulkEditVirtualRow = computed(() => ({
    original: bulkEditData.value as ZodAffectType,
  }));

  // Row pinning state - pin new affects to the top
  const rowPinning = computed<RowPinningState>(() => ({
    top: Array.from(newAffects),
    bottom: [],
  }));

  const { changePage, currentPage, pages } = usePagination(totalPages);

  const pagination = computed(() => ({
    pageIndex: showAll.value ? 0 : currentPage.value - 1,
    pageSize: showAll.value ? currentAffects.value.length : settings.value.affectsPerPage,
  }));

  // Automatically filter affects to show only those with related CVEs when they exist
  const displayAffects = computed(() => {
    if (relatedAffects.size === 0) {
      return settings.value.affectsGrouping ? groupedAffects.value : currentAffects.value;
    }

    const hasSharedStream = (affect: ZodAffectType) =>
      getAffectUuidsForStream(`${affect.ps_update_stream}:${affect.ps_component}`).length > 1;

    const filteredAffects = currentAffects.value.filter(hasSharedStream);

    if (!settings.value.affectsGrouping) {
      return filteredAffects;
    }

    // Group filtered affects by ps_module
    const groupsByModule = new Map<string, ZodAffectType[]>();
    for (const affect of filteredAffects) {
      if (newAffects.has(affectUUID(affect) ?? '')) continue;

      const module = affect.ps_module ?? '';
      const group = groupsByModule.get(module) ?? [];
      if (group.length === 0) groupsByModule.set(module, group);
      group.push(affect);
    }

    return Array.from(groupsByModule.values()).map(group => ({
      ...group[0],
      rows: group.length > 1 ? group.slice(1) : [],
    }));
  });

  const table = useVueTable({
    get data() { return displayAffects.value; },
    get columns() { return columns.value; },
    getRowId: row => affectUUID(row) ?? '',
    getSubRows: row => settings.value.affectsGrouping ? row.rows : undefined,
    columnResizeMode: 'onChange',
    columnResizeDirection: 'ltr',
    initialState: {
      columnSizing: settings.value.affectsSizing,
    },
    filterFromLeafRows: true,
    enableSubRowSelection: false,
    enableRowPinning: true,
    keepPinnedRows: true,
    state: {
      get columnVisibility() { return settings.value.affectsVisibility; },
      get pagination() { return pagination.value; },
      get sorting() { return sorting.value; },
      get globalFilter() { return globalFilter.value; },
      get columnFilters() { return columnFilters.value; },
      get columnOrder() { return settings.value.affectsColumnOrder; },
      get columnSizing() { return settings.value.affectsSizing; },
      get expanded() { return expandedRows.value; },
      get rowPinning() { return rowPinning.value; },
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
          labels: [],
          cvss_scores: [],
          tracker: null,
          subpackage_purls: [],
        }, ...currentAffects.value];
      },

      updateData: (rowIndex, columnId, value, parentIndex) => {
        let currentAffect = currentAffects.value[rowIndex];

        if (settings.value.affectsGrouping) {
          const rowUUID = parentIndex !== undefined
            ? affectUUID(groupedAffects.value[parentIndex].rows[rowIndex])
            : affectUUID(groupedAffects.value[rowIndex]);

          const index = affectUUIDMap.value.get(rowUUID)!;
          currentAffect = currentAffects.value[index];
        }

        currentAffect[columnId] = value;
        markModified(affectUUID(currentAffect));
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

        // Mark all as filing and track successes
        let successCount = 0;
        trackersToFile.forEach(({ uuid }) => table.options.meta?.filingTracker.add(uuid!));

        // File trackers sequentially (as per user requirement)
        for (const trackerToFile of trackersToFile) {
          const streamKey = `${trackerToFile.ps_update_stream}:${trackerToFile.ps_component}`;
          const affectUuidsForStream = getAffectUuidsForStream(streamKey);

          if (affectUuidsForStream.length > 1) {
            await fileTracker({
              affects: affectUuidsForStream,
              ps_update_stream: trackerToFile.ps_update_stream!,
            })
              .then(() => successCount++)
              .catch(() => {}) // Error is handled by the service
              .finally(() => table.options.meta?.filingTracker.delete(trackerToFile.uuid!));
          } else {
            await fileTracker(trackerToFile)
              .then(() => successCount++)
              .catch(() => {}) // Error is handled by the service
              .finally(() => table.options.meta?.filingTracker.delete(trackerToFile.uuid!));
          }
        }

        // Show success notification
        showSuccessToast(successCount, 'tracker', 'filed');

        refreshData();
        if (successCount) trackerStatusRefresh.value++;
      },
      filingTracker: reactive(new Set()),
      unavailableTrackers: reactive(new Set()),
      relatedAffects,
    },
    filterFns: {
      arrIncludesPartial,
      arrIncludesWithBlanks,
      cvssScore,
    },
    globalFilterFn: 'includesString',
    onSortingChange: createChangeHandler(sorting),
    onGlobalFilterChange: createChangeHandler(globalFilter),
    onColumnFiltersChange: createChangeHandler(columnFilters),
    onColumnOrderChange: createChangeHandler(settings.value, 'affectsColumnOrder'),
    onColumnVisibilityChange: createChangeHandler(settings.value, 'affectsVisibility'),
    onColumnSizingChange: createChangeHandler(settings.value, 'affectsSizing'),
    onExpandedChange: createChangeHandler(expandedRows),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
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

  function closeDialog() {
    if (!isClosingTrackers.value) {
      discoveryRun++;
      showCloseDialog.value = false;
    }
  }

  async function closeSelectedTrackers() {
    const rows = table.getSelectedRowModel().flatRows;
    if (!rows.length) return;
    showCloseDialog.value = true;
    const run = ++discoveryRun;
    isDiscoveringClose.value = true;
    closeErrors.value = [];
    closeTransitions.value = {};
    closeChoice.value = { resolution: '' };
    closeRows.value = [];
    closeResolutions.value = [];
    closeVexOptions.value = [];
    closeRequiresVex.value = false;

    const ineligible = rows.filter(row => row.original.tracker?.type !== 'JIRA'
      || !row.original.tracker.external_system_id);
    closeErrors.value.push(...ineligible.map(row => `${row.id}: no Jira tracker`));
    closeRows.value = rows.filter(row => !ineligible.includes(row))
      .map(row => ({ id: row.id, key: row.original.tracker!.external_system_id }));
    if (!closeRows.value.length) closeErrors.value.push('Select at least one Jira tracker.');

    const keys = [...new Set(closeRows.value.map(row => row.key))];
    const results = await Promise.allSettled(keys.map(key => getJiraTransitions(key)));
    if (run !== discoveryRun) return;
    results.forEach((result, i) => {
      const key = keys[i];
      if (result.status === 'rejected') {
        closeErrors.value.push(`${key}: could not load Jira close options: ${jiraError(result.reason)}`);
        return;
      }
      const transition = getCloseTransition(result.value.data?.transitions ?? []);
      if (!transition) {
        closeErrors.value.push(`${key}: no transition to Closed`);
        return;
      }
      const resolution = transition.fields?.resolution;
      if (!resolution?.operations?.includes('set') || !resolution.allowedValues?.length) {
        closeErrors.value.push(`${key}: no selectable resolution on close transition`);
        return;
      }
      const vex = Object.values(transition.fields ?? {}).find(field => field.name === 'VEX Justification');
      if (vex?.required && (!vex.operations?.includes('set') || !vex.allowedValues?.length)) {
        closeErrors.value.push(`${key}: required VEX justification is unavailable`);
        return;
      }
      const unsupported = Object.entries(transition.fields ?? {}).filter(([id, field]) =>
        field.required && id !== 'resolution' && field.name !== 'VEX Justification');
      if (unsupported.length) {
        closeErrors.value.push(`${key}: required fields not supported: `
        + unsupported.map(([, f]) => f.name).join(', '));
        return;
      }
      closeTransitions.value[key] = transition;
      const options = resolution.allowedValues.map(v => ({ id: v.id, name: v.name ?? v.value ?? v.id }));
      closeResolutions.value = Object.keys(closeTransitions.value).length === 1
        ? options
        : closeResolutions.value.filter(option => options.some(v => v.name === option.name));
      if (vex?.required) closeRequiresVex.value = true;
      const vexOptions = vex?.operations?.includes('set')
        ? (vex.allowedValues ?? []).map(v => ({ id: v.id, name: v.value ?? v.name ?? v.id }))
        : [];

      closeVexOptions.value = Object.keys(closeTransitions.value).length === 1
        ? vexOptions
        : closeVexOptions.value.filter(option => vexOptions.some(v => v.name === option.name));
    });
    if (keys.length && !closeResolutions.value.length) closeErrors.value.push('No common close resolution.');
    if (closeRequiresVex.value && !closeVexOptions.value.length) closeErrors.value.push('No common VEX justification.');
    if (closeRequiresVex.value) {
      for (const key of Object.keys(closeTransitions.value)) {
        if (!Object.values(closeTransitions.value[key].fields ?? {}).some(f =>
          f.name === 'VEX Justification' && f.allowedValues?.length && f.operations?.includes('set'))) {
          closeErrors.value.push(`${key}: no VEX justification options`);
        }
      }
    }
    if (keys.length && Object.keys(closeTransitions.value).length !== keys.length && !closeErrors.value.length) {
      closeErrors.value.push('Not all Jira trackers can be closed.');
    }
    isDiscoveringClose.value = false;
  }

  async function submitCloseTrackers() {
    if (isClosingTrackers.value || isDiscoveringClose.value || closeErrors.value.length
      || !closeChoice.value.resolution || (closeRequiresVex.value && !closeChoice.value.vexJustification)) return;
    // All choices are checked against each issue before the first write.
    const choices = [...new Set(closeRows.value.map(row => row.key))].map((key) => {
      const transition = closeTransitions.value[key];
      const resolution = transition.fields!.resolution.allowedValues!.find(v =>
        (v.name ?? v.value ?? v.id) === closeResolutions.value.find(r => r.id === closeChoice.value.resolution)?.name);
      const vexField = Object.values(transition.fields ?? {}).find(f => f.name === 'VEX Justification');
      const selectedVex = closeVexOptions.value.find(o => o.id === closeChoice.value.vexJustification)?.name;
      const vex = vexField?.allowedValues?.find(v => (v.value ?? v.name ?? v.id) === selectedVex);
      return { key,
        transition,
        choice: { resolution: resolution?.id ?? '',
          vexJustification: vex?.id,
          comment: closeChoice.value.comment } };
    });
    if (choices.some(({ choice, transition }) => !choice.resolution
      || (Object.values(transition.fields ?? {}).some(f => f.name === 'VEX Justification' && f.required)
      && !choice.vexJustification)
      || (closeChoice.value.vexJustification && !choice.vexJustification))) {
      closeErrors.value.push('The selected choices are not valid for every tracker.');
      return;
    }
    isClosingTrackers.value = true;
    try {
      const failed: string[] = [];
      const succeeded = new Set<string>();
      for (const { choice, key, transition } of choices) {
        try {
          await closeJiraIssue(key, transition, choice);
          succeeded.add(key);
        } catch (error) {
          failed.push(`${key}: ${jiraError(error)}`);
        }
      }
      showSuccessToast(succeeded.size, 'tracker', 'closed');
      if (failed.length) useToastStore().addToast({
        title: 'Some trackers could not be closed',
        body: `${failed.join('\n')}\nFailed trackers remain selected for the user to submit again.`,
        css: 'warning',
      });
      if (succeeded.size) {
        onFailedSelection?.(new Set(closeRows.value.filter(row => !succeeded.has(row.key)).map(row => row.key)));
        for (const row of closeRows.value) {
          if (succeeded.has(row.key)) table.getRow(row.id)?.toggleSelected(false);
        }
        onRefreshFlaw?.();
      }
    } finally {
      showCloseDialog.value = false;
      isClosingTrackers.value = false;
    }
  }

  function fitColumnWidth(column: Column<ZodAffectType>) {
    const FONT_SIZE = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const HEADER_CHAR_WIDTH = FONT_SIZE - 4; // Bold monospace
    const BODY_CHAR_WIDTH = FONT_SIZE - 6;    // Regular monospace
    const PADDING = 32;

    const headerWidth = (column.columnDef.header?.toString() || '').length * HEADER_CHAR_WIDTH;
    const maxBodyWidth = Math.max(
      0,
      ...column.getFacetedRowModel().flatRows
        .map(row => (row.getValue(column.id)?.toString() || '').length * BODY_CHAR_WIDTH),
    );
    settings.value.affectsSizing[column.id] = Math.max(headerWidth, maxBodyWidth) + PADDING;
  }

  async function selectRelatedTrackers() {
    isFetchingSuggestedTrackers.value = true;
    table.options.meta?.unavailableTrackers.clear();

    const trackers: TrackerSuggestions = await getTrackersForFlaws({ flaw_uuids: [flaw.value.uuid] });
    const rows = table.getFilteredRowModel().flatRows;

    trackers.streams_components.forEach((stream) => {
      if (stream.selected || stream.offer?.selected) {
        const row = rows.find(row =>
          row.original.uuid === stream.affect.uuid
          && !row.original.tracker,
        );
        if (row) {
          row.toggleSelected(true);
        }
      }
    });

    isFetchingSuggestedTrackers.value = false;

    if (trackers?.not_applicable?.length) {
      const streams = trackers?.not_applicable.map((affect) => {
        table.options.meta?.unavailableTrackers.add(affect.uuid!);

        return `${affect.ps_update_stream}/${affect.ps_component}`;
      },
      ).join('\n');

      useToastStore().addToast({
        title: 'Tracker suggestions',
        body: `These affects dot not have available trackers:\n${streams}`,
        css: 'warning',
      });
    }
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
      columnFilters,
      currentAffects,
      currentPage,
      globalFilter,
      isFetchingSuggestedTrackers,
      modifiedAffects,
      newAffects,
      pages,
      removedAffects,
      showAll,
      table,
      totalPages,
      groupedAffects,
      expandedRows,
      isBulkEditMode,
      bulkEditData,
      bulkEditChangedFields,
      bulkEditSelectedRowIds,
      bulkEditVirtualRow,
      isClosingTrackers,
      isDiscoveringClose,
      showCloseDialog,
      closeErrors,
      closeRows,
      closeResolutions,
      closeVexOptions,
      closeRequiresVex,
      closeChoice,
    },
    actions: {
      changeItemsPerPage,
      changePage,
      closeSelectedTrackers,
      closeDialog,
      submitCloseTrackers,
      deleteSelectedRows,
      fileSelectedTrackers,
      fitColumnWidth,
      refreshData,
      revertAllChanges,
      selectRelatedTrackers,
      toggleColumnVisibility,
      enterBulkEditMode,
      exitBulkEditMode,
      updateBulkEditField,
      commitBulkEdits,
    },
  };
}
