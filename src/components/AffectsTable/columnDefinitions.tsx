import { createColumnHelper } from '@tanstack/vue-table';
import type {
  CellContext,
  ColumnDefTemplate,
  DeepKeys,
  Row,
  RowData,
  Table,
} from '@tanstack/vue-table';

import { useMultiFlawTrackers } from '@/composables/useMultiFlawTrackers';

import type { ZodAffectType } from '@/types';
import {
  affectAffectedness,
  affectImpacts,
  affectJustification,
  affectResolutions,
  possibleAffectResolutions,
} from '@/types/zodAffect';
import { affectRhCvss3, formatDateWithTimezone } from '@/utils/helpers';
import { labelColorMap } from '@/constants';

import EditableCell from './EditableCell.vue';
import RowActions from './RowActions.vue';
import TrackerLink from './TrackerLink.vue';

declare module '@tanstack/vue-table' {

  interface ColumnMeta<TData extends RowData, TValue> {
    bulkEditable?: boolean;
    cvss?: boolean;
    enum?: ((row?: Row<TData>) => Record<string, string>) | Record<string, string>;
    extraColumn?: DeepKeys<TData>;
    filter?: boolean;
    onValueChange?: (newValue: TValue, row: Row<TData>, table: Table<TData>) => void;
  }
}

const editableCellRenderer: ColumnDefTemplate<CellContext<ZodAffectType, any>> =
 ({ column, getValue, row, table }) =>
   <EditableCell row={row} table={table} column={column} getValue={getValue} />;

export default function AffectColumnDefinitions() {
  const columnHelper = createColumnHelper<ZodAffectType>();
  const { actions: { getRelatedCvesForAffect } } = useMultiFlawTrackers();

  const columns = [
    columnHelper.display({
      id: 'Select',
      header: ({ table }) => {
        return (
          <div>
            <input
              type="checkbox"
              class="form-check-input"
              checked={table.getIsAllRowsSelected()}
              indeterminate={table.getIsSomeRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
            {table.getCanSomeRowsExpand() && (
              <i
                role="button"
                onClick={() => table.toggleAllRowsExpanded()}
                class={'p-1 ps-2 text-white ' +
                  (table.getIsAllRowsExpanded() ? 'bi-caret-down-fill' : 'bi-caret-right-fill')}
              >
              </i>
            )}
          </div>

        );
      },
      cell: ({ row }) => {
        return (
          <div style={{ paddingLeft: `${row.depth * 20}px` }}>
            <input
              type="checkbox"
              class="form-check-input"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
            />
            {row.getCanExpand() && (
              <i
                role="button"
                onClick={row.getToggleExpandedHandler()}
                class={'p-1 ps-2 ' +
                  (row.getIsExpanded() ? 'bi-caret-down-fill' : 'bi-caret-right-fill')}
              >
              </i>
            )}
          </div>
        );
      },
      size: 40,
      enableResizing: false,
      enableSorting: false,
      enableGlobalFilter: false,
      enableColumnFilter: false,
      meta: {
        filter: false,
      },
    }),
    columnHelper.display({
      id: 'cve',
      header: 'Related CVEs',
      cell: ({ row }) => {
        const relatedCves = getRelatedCvesForAffect(row.original);
        if (!relatedCves.length) return null;

        return (
          <div class="d-flex gap-1 flex-wrap">
            {relatedCves.map(cve => (
              <span
                key={cve}
                class="badge bg-info text-dark"
                title={`This stream is also affected by ${cve}`}
              >
                {cve}
              </span>
            ))}
          </div>
        );
      },
      size: 150,
      enableSorting: false,
      enableGlobalFilter: false,
      enableColumnFilter: false,
      meta: {
        filter: false,
      },
    }),
    columnHelper.accessor('labels', {
      cell: column => (column.getValue()?.map(name => (
        <span
          class="badge rounded-pill border text-black"
          style={{ backgroundColor: labelColorMap[name] }}
        >
          {name}
        </span>
      ))
      ),
      filterFn: 'arrIncludesPartial',
      header: 'Label',
      size: 110,
    }),
    columnHelper.accessor('ps_update_stream', {
      cell: editableCellRenderer,
      header: 'Product Stream',
      size: 190,
      sortingFn: 'alphanumeric',
      meta: {
        bulkEditable: true,
      },
    }),
    columnHelper.accessor('ps_module', {
      cell: editableCellRenderer,
      header: 'Module',
      sortingFn: 'alphanumeric',
      meta: {
        bulkEditable: true,
      },
    }),
    columnHelper.accessor('ps_component', {
      cell: editableCellRenderer,
      header: 'Component',
      sortingFn: 'alphanumeric',
      meta: {
        bulkEditable: true,
      },
    }),
    columnHelper.accessor('purl', {
      cell: editableCellRenderer,
      header: 'Analyzed Component',
      size: 220,
      sortingFn: 'alphanumeric',
      meta: {
        bulkEditable: true,
      },
    }),
    columnHelper.accessor('subpackage_purls', {
      cell: editableCellRenderer,
      header: 'Subpackage PURLs',
      size: 280,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.subpackage_purls?.length || 0;
        const b = rowB.original.subpackage_purls?.length || 0;
        return a - b;
      },
      meta: {
        bulkEditable: true,
      },
    }),
    columnHelper.accessor('affectedness', {
      cell: editableCellRenderer,
      header: 'Affectedness',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        bulkEditable: true,
        enum: affectAffectedness,
        onValueChange: (newValue: keyof typeof possibleAffectResolutions, row, table) => {
          const { not_affected_justification, resolution } = row.original;
          const { updateData } = table.options.meta!;

          // Clear resolution if empty or no longer valid
          if (!newValue || (resolution && !Object.values(possibleAffectResolutions[newValue]).includes(resolution))) {
            updateData(row.index, 'resolution', '');
          }

          // Clear justification if empty or not "not_affected"
          if (!newValue || (newValue !== 'NOTAFFECTED' && not_affected_justification)) {
            updateData(row.index, 'not_affected_justification', '');
          }

          // Clear impact for "not_affected"
          if (newValue === 'NOTAFFECTED') {
            updateData(row.index, 'impact', '');
          }
        },
      },
      size: 170,
    }),
    columnHelper.accessor('not_affected_justification', {
      cell: editableCellRenderer,
      header: 'Not Affected Justification',
      size: 282,
      meta: {
        bulkEditable: true,
        enum: row => row
          ? row?.original.affectedness === 'NOTAFFECTED' ? affectJustification : {}
          : affectJustification,
      },
    }),
    columnHelper.accessor('resolution', {
      cell: editableCellRenderer,
      header: 'Resolution',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        bulkEditable: true,
        enum: row => row
          ? row.original.affectedness
            ? possibleAffectResolutions[row.original.affectedness]
            : {}
          : affectResolutions,
        extraColumn: 'tracker.resolution',
      },
    }),
    columnHelper.accessor('impact', {
      cell: editableCellRenderer,
      header: 'Impact',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        bulkEditable: true,
        enum: affectImpacts,
      },
    }),
    columnHelper.accessor('cvss_scores', {
      cell: editableCellRenderer,
      sortingFn: (rowA, rowB) => {
        const scoreA = affectRhCvss3(rowA.original)?.score || 0;
        const scoreB = affectRhCvss3(rowB.original)?.score || 0;
        const diff = scoreA - scoreB;
        return Math.sign(diff);
      },
      header: 'CVSS',
      filterFn: 'cvssScore',
      size: 100,
      meta: {
        cvss: true,
        bulkEditable: true,
      },
    }),
    columnHelper.accessor(row => `${row.tracker?.external_system_id || ''}`, {
      cell: ({ row }) => <TrackerLink tracker={row.original.tracker} />,
      header: 'Tracker',
      enableGlobalFilter: true,
      sortingFn: 'alphanumeric',

    }),
    columnHelper.accessor(row => row.tracker?.status, {
      cell: column => column.getValue()?.toUpperCase(),
      header: 'Tracker Status',
      enableGlobalFilter: false,
      size: 185,
    }),
    columnHelper.accessor('created_dt', {
      cell: column => column.getValue() ? formatDateWithTimezone(column.getValue()!) : '',
      header: 'Affect Creation date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 272,
      sortingFn: 'datetime',

    }),
    columnHelper.accessor('updated_dt', {
      cell: column => column.getValue() ? formatDateWithTimezone(column.getValue()!) : '',
      header: 'Affect Update date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 248,
      sortingFn: 'datetime',

    }),
    columnHelper.accessor(row => row.tracker?.created_dt, {
      cell: column => column.getValue() ? formatDateWithTimezone(column.getValue()!) : '',
      header: 'Tracker Creation date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 284,
      sortingFn: 'datetime',

    }),
    columnHelper.accessor(row => row.tracker?.updated_dt, {
      cell: column => column.getValue() ? formatDateWithTimezone(column.getValue()!) : '',
      header: 'Tracker Update date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 260,
      sortingFn: 'datetime',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row, table }) => <RowActions row={row} table={table} />,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      enableResizing: false,
      size: 80,
      meta: {
        filter: false,
      },
    }),
  ];

  return columns;
}
