import { computed } from 'vue';

import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export type SearchSchema = {
  default: boolean;
  name: string;
  queryFilter: string;
  searchFilters: Record<string, string>;
};

const _searchStoreKey = 'SearchStore';
const searches = useLocalStorage(_searchStoreKey, [] as SearchSchema[]);

function saveSearch(name: string, filters: Record<string, string>, query: string) {
  const search: SearchSchema = { name: name, searchFilters: filters, queryFilter: query, default: false };
  searches.value.push(search);
}

function removeSearch(index: number) {
  searches.value.splice(index, 1);
}

function resetSearches() {
  searches.value = [];
}

function setDefaultSearch(index: number) {
  if (defaultSearch.value === searches.value[index] && searches.value[index].default) {
    searches.value[index].default = false;
  } else {
    searches.value.forEach((search, i) => {
      search.default = i === index;
    });
  }
}

const defaultSearch = computed(() => searches.value.find(search => search.default) || null);

export const useSearchStore = defineStore('SearchStore', () => {
  const savedSearches = computed(() => searches.value || []);

  return {
    savedSearches,
    defaultSearch,
    setDefaultSearch,
    saveSearch,
    removeSearch,
    resetSearches,
  };
});
