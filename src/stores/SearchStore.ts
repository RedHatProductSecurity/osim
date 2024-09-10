import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';

export type SearchSchema = {
  searchFilters: Record<string, string>,
  queryFilter: string,
}

const defaultValues: SearchSchema = { searchFilters: {}, queryFilter: '' };

const _searchStoreKey = 'SearchStore';
const search = useLocalStorage(_searchStoreKey, defaultValues);

export const useSearchStore = defineStore('SearchStore', () => {
  const searchFilters = computed(() => search.value.searchFilters || {});
  const queryFilter = computed(() => search.value.queryFilter || '');

  function saveFilter(filters: Record<string, string>, query: string = '') {
    search.value.searchFilters = filters;
    search.value.queryFilter = query;
  }

  function resetFilter() {
    search.value.searchFilters = {};
    search.value.queryFilter = '';
  }

  return {
    searchFilters,
    queryFilter,
    saveFilter,
    resetFilter
  };
});

