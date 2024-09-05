import { computed } from 'vue';

import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export type SearchSchema = {
  queryFilter: string;
  searchFilters: Record<string, string>;
};

const defaultValues: SearchSchema = { searchFilters: {}, queryFilter: '' };

const _searchStoreKey = 'SearchStore';
const search = useLocalStorage(_searchStoreKey, defaultValues);
function saveFilter(filters: Record<string, string>, query: string = '') {
  search.value.searchFilters = filters;
  search.value.queryFilter = query;
}

function resetFilter() {
  search.value.searchFilters = {};
  search.value.queryFilter = '';
}
export const useSearchStore = defineStore('SearchStore', () => {
  const searchFilters = computed(() => search.value.searchFilters || {});
  const queryFilter = computed(() => search.value.queryFilter || '');

  return {
    searchFilters,
    queryFilter,
    saveFilter,
    resetFilter,
  };
});
