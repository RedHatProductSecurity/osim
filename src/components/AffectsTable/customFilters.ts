import type { FilterFn } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';

declare module '@tanstack/vue-table' {
  interface FilterFns {
    arrIncludesPartial: FilterFn<string>;
    arrIncludesWithBlanks: FilterFn<string[]>;
    cvssScore: FilterFn<string>;
  }
}

export const arrIncludesWithBlanks: FilterFn<string> = (row, columnId, filterValue: string[]) => {
  return filterValue.length ? filterValue.includes(row.getValue(columnId)) : true;
};
arrIncludesWithBlanks.autoRemove = filterVal => !filterVal?.length;

export const cvssScore: FilterFn<ZodAffectType> = (row, columnId, filterValue: string) => {
  const rhCvssScore = affectRhCvss3(row.original)?.score || 0;
  const numberValue = Number.parseFloat(filterValue);

  if (numberValue % 1 !== 0) {
    return numberValue.toFixed(2) === rhCvssScore.toFixed(2);
  }
  return numberValue === Math.trunc(rhCvssScore);
};

export const arrIncludesPartial: FilterFn<string> = (row, columnId, filterValue: string) => {
  return row.getValue<string[]>(columnId).some(value => value.includes(filterValue));
};
arrIncludesPartial.autoRemove = filterVal => !filterVal?.length;
