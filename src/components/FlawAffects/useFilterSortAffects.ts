import { type Ref, ref } from 'vue';

import { prop, descend, ascend, sortWith } from 'ramda';

import {
  type ZodAffectType,
} from '@/types/zodAffect';

import { type affectSortKeys } from './flawAffectConstants';

const selectedModules = ref<string[]>([]);

// Affect Field Specific Filters
const affectednessFilters = ref<string[]>([]);
const resolutionFilters = ref<string[]>([]);
const impactFilters = ref<string[]>([]);

const sortKey = ref<affectSortKeys>('ps_module');
const sortOrder = ref(ascend);

function setFilter(filterArray: Ref<string[]>, sortValue: string) {
  const index = filterArray.value.indexOf(sortValue);
  if (index > -1) {
    filterArray.value.splice(index, 1);
  } else {
    filterArray.value.push(sortValue);
  }
}

export function useFilterSortAffects() {
  function setSort(key: affectSortKeys) {
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === ascend ? descend : ascend;
    } else {
      sortKey.value = key;
      sortOrder.value = ascend;
    }
  }

  function filterAffects(affects: ZodAffectType[]): ZodAffectType[] {
    const includeInFilter = (affectFieldFilters: Ref<string[]>, affectFieldValue: string): boolean =>
      affectFieldFilters.value.length === 0 || affectFieldFilters.value.includes(affectFieldValue);

    const filtersByFieldGetters: [Ref<string[]>, (affect: ZodAffectType) => string][] = [
      [selectedModules, affect => affect.ps_module ?? ''],
      [affectednessFilters, affect => affect.affectedness ?? ''],
      [resolutionFilters, affect => affect.resolution ?? ''],
      [impactFilters, affect => affect.impact ?? ''],
    ];

    const appliedFilters = (affect: ZodAffectType) => filtersByFieldGetters.reduce(
      (shouldInclude, [filters, getFieldValue]) => shouldInclude && includeInFilter(filters, getFieldValue(affect)),
      true,
    );

    return affects.filter(appliedFilters);
  }

  function sortAffects(affects: ZodAffectType[], standard: boolean): ZodAffectType[] {
    const order = sortOrder.value;

    const customSortFn = (affect: ZodAffectType) => {
      if (sortKey.value === 'trackers') {
        return affect.trackers.length;
      } else if (sortKey.value === 'cvss_scores') {
        return affect[sortKey.value].length;
      }
      if (affect[sortKey.value] === '') {
        return sortOrder.value === ascend ? '_' : 'Z';
      }
      return affect[sortKey.value] || 0;
    };

    const comparators = standard
      ? [ascend<ZodAffectType>(prop('ps_module')), ascend<ZodAffectType>(prop('ps_component'))]
      : [
          order<ZodAffectType>(customSortFn),
          order<ZodAffectType>(sortKey.value === 'ps_module' ? prop('ps_component') : prop('ps_module')),
        ];

    const savedAffects = affects.filter(({ uuid }) => uuid);
    const newAffects = affects.filter(({ uuid }) => !uuid);
    return [...newAffects, ...sortWith(comparators)(savedAffects)];
  }

  function setAffectednessFilter(affectedness: string) {
    setFilter(affectednessFilters, affectedness);
  }

  function setResolutionFilter(resolution: string) {
    setFilter(resolutionFilters, resolution);
  }

  function setImpactFilter(impact: string) {
    setFilter(impactFilters, impact);
  }

  return {
    sortKey,
    sortOrder,
    setSort,
    sortAffects,
    filterAffects,
    selectedModules,
    affectednessFilters,
    resolutionFilters,
    impactFilters,
    setAffectednessFilter,
    setResolutionFilter,
    setImpactFilter,
  };
}
