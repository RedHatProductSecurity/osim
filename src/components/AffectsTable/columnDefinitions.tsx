import { createColumnHelper, type CellContext, type ColumnDefTemplate, type RowData } from '@tanstack/vue-table';
import { DateTime } from 'luxon';

import type { ZodAffectType } from '@/types';
import { affectAffectedness, affectImpacts, affectResolutions } from '@/types/zodAffect';
import { affectRhCvss3, formatDateWithTimezone } from '@/utils/helpers';

import EditableCell from './EditableCell.vue';

declare module '@tanstack/vue-table' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    cvss?: boolean;
    enum?: Record<string, string>;
    filter?: boolean;
  }
}

const cellRenderer: ColumnDefTemplate<CellContext<ZodAffectType, unknown>> = ({ column, getValue, row, table }) =>
  <EditableCell row={row} table={table} column={column} getValue={getValue} />;

export default function AffectColumnDefinitions() {
  const columnHelper = createColumnHelper<ZodAffectType>();

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => {
        return (
          <input
            type="checkbox"
            class="form-check-input"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        );
      },
      cell: ({ row }) => {
        return (
          <input
            type="checkbox"
            class="form-check-input"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        );
      },
      size: 40,
      enableSorting: false,
      enableGlobalFilter: false,
      enableColumnFilter: false,
      meta: {
        filter: false,
      },
    }),
    columnHelper.accessor('ps_module', {
      cell: cellRenderer,
      header: 'Module',
    }),
    columnHelper.accessor('ps_component', {
      cell: cellRenderer,
      header: 'Component',
    }),
    columnHelper.accessor('purl', {
      cell: cellRenderer,
      header: 'Analyzed Component',
      size: 220,
    }),
    columnHelper.accessor('affectedness', {
      cell: cellRenderer,
      header: 'Affectedness',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        enum: affectAffectedness,
      },
      size: 170,
    }),
    columnHelper.accessor('not_affected_justification', {
      cell: cellRenderer,
      header: 'Not Affected Justification',
      size: 282,
    }),
    columnHelper.accessor('resolution', {
      cell: cellRenderer,
      header: 'Resolution',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        enum: affectResolutions,
      },
    }),
    columnHelper.accessor('impact', {
      cell: cellRenderer,
      header: 'Impact',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        enum: affectImpacts,
      },
    }),
    columnHelper.accessor('cvss_scores', {
      cell: cellRenderer,
      sortingFn: (rowA, rowB) => {
        const scoreA = affectRhCvss3(rowA.original)?.score || 0;
        const scoreB = affectRhCvss3(rowB.original)?.score || 0;
        const diff = scoreA - scoreB;
        return diff > 0 ? 1 : diff < 0 ? -1 : 0;
      },
      header: 'CVSS',
      filterFn: 'cvssScore',
      size: 100,
      meta: {
        cvss: true,
      },
    }),
    columnHelper.accessor('created_dt', {
      cell: column => formatDateWithTimezone(column.getValue() || DateTime.now().toISO()),
      header: 'Affect Creation date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 234,
    }),
    columnHelper.accessor('updated_dt', {
      cell: column => formatDateWithTimezone(column.getValue() || DateTime.now().toISO()),
      header: 'Affect Update date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 220,
    }),
  ];

  return columns;
}
