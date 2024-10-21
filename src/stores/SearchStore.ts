import { computed } from 'vue';

import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export type SearchSchema = {
  queryFilter: string;
  searchFilters: Record<string, string>;
};

const _searchStoreKey = 'SearchStore';
const searches = useLocalStorage(_searchStoreKey, [] as SearchSchema[]);

function saveSearch(filters: Record<string, string>, query: string) {
  const search: SearchSchema = { searchFilters: filters, queryFilter: query };
  searches.value.push(search);
}

function removeSearch(index: number) {
  searches.value.splice(index, 1);
}

function resetSearches() {
  searches.value = [];
}

export const useSearchStore = defineStore('SearchStore', () => {
  const savedSearches = computed(() => searches.value || []);

  return {
    savedSearches,
    saveSearch,
    removeSearch,
    resetSearches,
  };
});
