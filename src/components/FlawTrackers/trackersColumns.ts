export interface TrackerColumn {
  hasFilter: boolean;
  index: number;
  key: string;
  label: string;
  sortable: boolean;
}

export const trackersColumns: TrackerColumn[] = [
  {
    key: 'bug_id',
    label: 'Bug ID',
    index: 0,
    sortable: false,
    hasFilter: false,
  },
  {
    key: 'module',
    label: 'Module',
    index: 1,
    sortable: false,
    hasFilter: false,
  },
  {
    key: 'component',
    label: 'Component',
    index: 2,
    sortable: false,
    hasFilter: false,
  },
  {
    key: 'product_stream',
    label: 'Product Stream',
    index: 3,
    sortable: false,
    hasFilter: false,
  },
  {
    key: 'status',
    label: 'Status',
    index: 4,
    sortable: false,
    hasFilter: true,
  },
  {
    key: 'resolution',
    label: 'Resolution',
    index: 5,
    sortable: false,
    hasFilter: false,
  },
  {
    key: 'created_dt',
    label: 'Created date',
    index: 6,
    sortable: true,
    hasFilter: false,
  },
  {
    key: 'updated_dt',
    label: 'Updated date',
    index: 7,
    sortable: true,
    hasFilter: false,
  },
];
