import { computed } from 'vue';

import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export type SearchSchema = {
  isDefault: boolean;
  name: string;
  queryFilter: string;
  searchFilters: Record<string, string>;
};

const _searchStoreKey = 'SearchStore';
const searches = useLocalStorage(_searchStoreKey, [] as SearchSchema[]);

// TODO remove once released to Prod (users existing stores will be converted)
if (!Array.isArray(searches.value)) {
  if ((searches.value as any).queryFilter || Object.keys((searches.value as any).searchFilters).length) {
    searches.value = [{
      name: 'default search',
      ...(searches.value as any),
      isDefault: true }] as SearchSchema[];
  } else {
    searches.value = [];
  }
}

function saveSearch(name: string, filters: Record<string, string>, query: string) {
  const search: SearchSchema = { name: name, searchFilters: filters, queryFilter: query, isDefault: false };
  searches.value.push(search);
}

function removeSearch(index: number) {
  searches.value.splice(index, 1);
}

function resetSearches() {
  searches.value = [];
}

function setDefaultSearch(index: number) {
  if (defaultSearch.value === searches.value[index] && searches.value[index].isDefault) {
    searches.value[index].isDefault = false;
  } else {
    searches.value.forEach((search, i) => {
      search.isDefault = i === index;
    });
  }
}

const defaultSearch = computed(() => searches.value.find(search => search.isDefault) || null);

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
