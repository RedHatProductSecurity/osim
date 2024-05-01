import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';

export const SearchSchema = z.object({
  searchFilters: z.record(z.string())
});

export type SearchType = z.infer<typeof SearchSchema>;
const defaultValues: SearchType = { searchFilters: {} };

const _searchStoreKey = 'SearchStore';
const search = useLocalStorage(_searchStoreKey, defaultValues);

export const useSearchStore = defineStore('SearchStore', () => {
  const searchFilters = computed(() => search.value.searchFilters || {});

  function saveFilter(filters: Record<string, string>) {
    search.value.searchFilters = filters;
  }

  function resetFilter() {
    search.value.searchFilters = {};
  }

  return {
    searchFilters,
    saveFilter,
    resetFilter
  };
});

