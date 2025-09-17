import { createColumnHelper, type RowData } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';
import { affectAffectedness, affectImpacts, affectResolutions } from '@/types/zodAffect';
import { formatDateWithTimezone } from '@/utils/helpers';

declare module '@tanstack/vue-table' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    enum?: Record<string, string>;
    filter?: boolean;
  }
}

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
      cell: column => column.getValue(),
      header: 'Module',
    }),
    columnHelper.accessor('ps_component', {
      cell: column => column.getValue(),
      header: 'Component',
    }),
    columnHelper.accessor('purl', {
      cell: column => column.getValue(),
      header: 'Analyzed Component',
      size: 220,
    }),
    columnHelper.accessor('affectedness', {
      cell: column => column.getValue(),
      header: 'Affectedness',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        enum: affectAffectedness,
      },
      size: 170,
    }),
    columnHelper.accessor('not_affected_justification', {
      cell: column => column.getValue(),
      header: 'Not Affected Justification',
      size: 282,
    }),
    columnHelper.accessor('resolution', {
      cell: column => column.getValue(),
      header: 'Resolution',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        enum: affectResolutions,
      },
    }),
    columnHelper.accessor('impact', {
      cell: column => column.getValue(),
      header: 'Impact',
      filterFn: 'arrIncludesWithBlanks',
      meta: {
        enum: affectImpacts,
      },
    }),
    columnHelper.accessor(row => `${row.cvss_scores?.[0]?.score ?? ''}`, {
      cell: column => column.getValue(),
      header: 'CVSS',
      size: 100,
    }),
    columnHelper.accessor('created_dt', {
      cell: column => formatDateWithTimezone(column.getValue() || ''),
      header: 'Affect Creation date',
      enableGlobalFilter: false,
      meta: {
        filter: false,
      },
      size: 234,
    }),
    columnHelper.accessor('updated_dt', {
      cell: column => formatDateWithTimezone(column.getValue() || ''),
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
