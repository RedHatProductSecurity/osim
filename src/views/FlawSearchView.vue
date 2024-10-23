<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';

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
  // TODO: Check if loaded saved search was modified to remind the user to save/discard new changes
  loadAdvancedSearch(draftQuery.value, draftFields.value);
  draftQuery.value = '';
  draftFields.value = {};
  loadedSearch.value = -1;
}

function saveSearch() {
  const filters = facets.value.reduce(
    (fields, { field, value }) => {
      if (field && (value || allowedEmptyFieldMapping[field])) {
        fields[field] = value;
      }
      return fields;
    },
    {} as Record<string, string>,
  );
  searchStore.saveSearch(filters, query.value);
  loadedSearch.value = searchStore.savedSearches.length - 1;
  addToast({
    title: 'Search saved',
    body: 'User\'s search saved on Slot ' + (searchStore.savedSearches.length),
  });
}

function updateSavedSearch() {
  const filters = facets.value.reduce(
    (fields, { field, value }) => {
      if (field && (value || allowedEmptyFieldMapping[field])) {
        fields[field] = value;
      }
      return fields;
    },
    {} as Record<string, string>,
  );
  searchStore.savedSearches[loadedSearch.value] = { searchFilters: filters, queryFilter: query.value };
  loadAdvancedSearch(query.value, filters);
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
}
</script>

<template>
  <main class="mt-3">
    <IssueSearchAdvanced
      :isLoading="isLoading"
      :loadedSearch
      :savedSearches="searchStore.savedSearches"
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
