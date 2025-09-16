import { createColumnHelper } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';

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
    }),
    columnHelper.accessor('affectedness', {
      cell: column => column.getValue(),
      header: 'Affectedness',
    }),
    columnHelper.accessor('not_affected_justification', {
      cell: column => column.getValue(),
      header: 'Not Affected Justification',
    }),
    columnHelper.accessor('resolution', {
      cell: column => column.getValue(),
      header: 'Resolution',
    }),
    columnHelper.accessor('impact', {
      cell: column => column.getValue(),
      header: 'Impact',
    }),
    columnHelper.accessor('cvss_scores', {
      cell: column => column.getValue()?.[0]?.score || '',
      header: 'CVSS',
      size: 60,
    }),
    columnHelper.accessor('created_dt', {
      cell: column => column.getValue(),
      header: 'Affect Creation date',
    }),
    columnHelper.accessor('updated_dt', {
      cell: column => column.getValue(),
      header: 'Affect Update date',
    }),
  ];

  return columns;
}
