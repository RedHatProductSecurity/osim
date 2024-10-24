<script setup lang="ts">
import { computed, ref, toRaw, watch, type Ref } from 'vue';

import { equals } from 'ramda';

import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import IssueQueue from '@/components/IssueQueue.vue';

import { useFlawsFetching } from '@/composables/useFlawsFetching';
import { useSearchParams } from '@/composables/useSearchParams';

import { useSearchStore } from '@/stores/SearchStore';
import { useToastStore } from '@/stores/ToastStore';
import { allowedEmptyFieldMapping } from '@/constants/flawFields';

const { isFinalPageFetched, isLoading, issues, loadFlaws, loadMoreFlaws, total } = useFlawsFetching();
const { facets, getSearchParams, loadAdvancedSearch, query } = useSearchParams();

const searchStore = useSearchStore();
const { addToast } = useToastStore();
const tableFilters = ref<Record<string, string>>({});

const loadedSearch = ref<number>(-1);
const draftQuery = ref('');
const draftFields = ref({});

const facetsParsed = computed(() => facets.value.reduce(
  (fields, { field, value }) => {
    if (field && (value || allowedEmptyFieldMapping[field])) {
      fields[field] = value;
    }
    return fields;
  },
  {} as Record<string, string>,
),
);

const changedSlot = computed(() =>
  loadedSearch.value >= 0
  && (!equals(toRaw(searchStore.savedSearches[loadedSearch.value].searchFilters), facetsParsed.value)
  || !equals(searchStore.savedSearches[loadedSearch.value].queryFilter, query.value)
  ),
);

const params = computed(() => {
  const searchParams = getSearchParams();
  const order = [searchParams.order, tableFilters.value.order]
    .filter(Boolean).join(',');

  if (searchParams.order && tableFilters.value.order) {
    searchParams.order += ',' + tableFilters.value.order;
  }
  const paramsObj = {
    ...tableFilters.value,
    ...searchParams,
    order,
  };

  return paramsObj;
});

watch(() => params, () => {
  loadFlaws(params);
}, {
  deep: true,
});

function fetchMoreFlaws() {
  loadMoreFlaws(params);
}

function setTableFilters(newFilters: Ref<Record<string, string>>) {
  tableFilters.value = {
    ...newFilters.value,
  };
}

function selectSavedSearch(index: number) {
  if (loadedSearch.value === index) {
    deselectSavedSearch();
    return;
  }

  if (loadedSearch.value === -1) {
    draftQuery.value = query.value;
    draftFields.value = facets.value;
  }

  const savedQuery = searchStore.savedSearches.at(index)?.queryFilter || '';
  const savedFields = searchStore.savedSearches.at(index)?.searchFilters || {};
  loadAdvancedSearch(savedQuery, savedFields);
  loadedSearch.value = index;
}

function deselectSavedSearch() {
  loadAdvancedSearch(draftQuery.value, draftFields.value);
  draftQuery.value = '';
  draftFields.value = {};
  loadedSearch.value = -1;
}

function saveSearch(name: string) {
  searchStore.saveSearch(name, facetsParsed.value, query.value);
  loadedSearch.value = searchStore.savedSearches.length - 1;
  addToast({
    title: 'Search saved',
    body: 'User\'s search saved on Slot ' + (searchStore.savedSearches.length),
  });
}

function updateSavedSearch() {
  searchStore.savedSearches[loadedSearch.value].queryFilter = query.value;
  searchStore.savedSearches[loadedSearch.value].searchFilters = facetsParsed.value;
  loadAdvancedSearch(query.value, facetsParsed.value);
  addToast({
    title: 'Slot updated',
    body: 'User\'s saved Slot ' + (loadedSearch.value + 1) + ' updated',
  });
}

function deleteSavedSearch() {
  searchStore.savedSearches.splice(loadedSearch.value, 1);
  loadedSearch.value = searchStore.savedSearches.length > 0
    ? loadedSearch.value > 0
      ? loadedSearch.value - 1
      : loadedSearch.value + 1
    : -1;
  deselectSavedSearch();
}
</script>

<template>
  <main class="mt-3">
    <IssueSearchAdvanced
      :isLoading="isLoading"
      :loadedSearch
      :savedSearches="searchStore.savedSearches"
      :changedSlot
      @savedSearch:select="selectSavedSearch"
      @filter:save="saveSearch"
      @filter:update="updateSavedSearch"
      @filter:delete="deleteSavedSearch"
    />
    <IssueQueue
      :issues="issues"
      :isLoading="isLoading"
      :isFinalPageFetched="isFinalPageFetched"
      :total="total"
      @flaws:fetch="setTableFilters"
      @flaws:load-more="fetchMoreFlaws"
    />
  </main>
</template>
