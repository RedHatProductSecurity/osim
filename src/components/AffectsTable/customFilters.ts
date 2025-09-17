import type { FilterFn } from '@tanstack/vue-table';

declare module '@tanstack/vue-table' {
  interface FilterFns {
    arrIncludesWithBlanks: FilterFn<string[]>;
  }
}

export const arrIncludesWithBlanks: FilterFn<string> = (row, columnId, filterValue: string[]) => {
  return filterValue.length ? filterValue.includes(row.getValue(columnId)) : true;
};
arrIncludesWithBlanks.autoRemove = filterVal => !filterVal?.length;
