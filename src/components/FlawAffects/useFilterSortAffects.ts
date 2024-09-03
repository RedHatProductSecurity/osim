import { type Ref, ref } from 'vue';

import { prop, descend, ascend, sortWith } from 'ramda';

import {
  type ZodAffectType,
} from '@/types/zodAffect';

import { type affectSortKeys } from './flawAffectConstants';

const selectedModules = ref<string[]>([]);

// Affect Field Specific Filters
const affectednessFilter = ref<string[]>([]);
const resolutionFilter = ref<string[]>([]);
const impactFilter = ref<string[]>([]);

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
    return affects.filter((affect) => {
      const matchesSelectedModules =
        selectedModules.value.length === 0 || selectedModules.value.includes(affect.ps_module);
      const matchesAffectednessFilter =
        affectednessFilter.value.length === 0 || affectednessFilter.value.includes(affect.affectedness ?? '');
      const matchesResolutionFilter =
        resolutionFilter.value.length === 0 || resolutionFilter.value.includes(affect.resolution ?? '');
      const matchesImpactsFilter =
        impactFilter.value.length === 0 || impactFilter.value.includes(affect.impact ?? '');
      return matchesSelectedModules && matchesAffectednessFilter && matchesResolutionFilter && matchesImpactsFilter;
    });
  }

  function sortAffects(affects: ZodAffectType[], standard: boolean): ZodAffectType[] {
    const order = sortOrder.value;

    const customSortFn = (affect: ZodAffectType) => {
      // const affectToSort = isBeingEdited(affect) ? getAffectPriorEdit(affect) : affect;
      if (sortKey.value === 'trackers') {
        return affect.trackers.length;
      } else if (sortKey.value === 'cvss_scores') {
        return affect[sortKey.value].length;
      }
      return affect[sortKey.value] || 0;
    };

    const comparators = standard
      ? [ascend<ZodAffectType>(prop('ps_module')), ascend<ZodAffectType>(prop('ps_component'))]
      : [order<ZodAffectType>(customSortFn),
          order<ZodAffectType>(sortKey.value === 'ps_module' ? prop('ps_component') : prop('ps_module'))];

    return sortWith([
      ascend((affect: ZodAffectType) => !affect.uuid ? 0 : 1),
      ...comparators,
    ])(affects);
  }

  function setAffectednessFilter(affectedness: string) {
    setFilter(affectednessFilter, affectedness);
  }

  function setResolutionFilter(resolution: string) {
    setFilter(resolutionFilter, resolution);
  }

  function setImpactFilter(impact: string) {
    setFilter(impactFilter, impact);
  }

  return {
    sortKey,
    sortOrder,
    setSort,
    sortAffects,
    filterAffects,
    selectedModules,
    affectednessFilter,
    resolutionFilter,
    impactFilter,
    setAffectednessFilter,
    setResolutionFilter,
    setImpactFilter,
  };
}
