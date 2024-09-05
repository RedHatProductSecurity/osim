<script setup lang="ts">
import { computed, onDeactivated, ref, watch, type Ref } from 'vue';

import { useSearchStore } from '@/stores/SearchStore';

import IssueQueue from '../components/IssueQueue.vue';
import { useFlawsFetching } from '../composables/useFlawsFetching';

const searchStore = useSearchStore();

const { isFinalPageFetched, isLoading, issues, loadFlaws, loadMoreFlaws, total } = useFlawsFetching();

const tableFilters = ref<Record<string, string>>({});

const showFilter = computed(() =>
  Object.keys(searchStore.searchFilters).length > 0 || searchStore.queryFilter !== '',
);

const isDefaultFilterSelected = ref<boolean>(showFilter.value);

const params = computed(() => {
  const paramsObj = {
    ...tableFilters.value,
    ...isDefaultFilterSelected.value && searchStore.searchFilters,
    ...isDefaultFilterSelected.value && { query: searchStore.queryFilter },
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

onDeactivated(() => {
  loadFlaws(params);
});

const defaultFilters = computed(() => {
  return {
    query: searchStore.queryFilter,
    ...searchStore.searchFilters,
  };
});
</script>

<template>
  <main class="mt-3">
    <IssueQueue
      v-model:isDefaultFilterSelected="isDefaultFilterSelected"
      :issues="issues"
      :isLoading="isLoading"
      :total="total"
      :isFinalPageFetched="isFinalPageFetched"
      :showFilter="showFilter"
      :defaultFilters="defaultFilters"
      @flaws:fetch="setTableFilters"
      @flaws:load-more="fetchMoreFlaws"
    />
  </main>
</template>
