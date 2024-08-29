<script setup lang="ts">
import { computed, onDeactivated, ref, watch, type Ref } from 'vue';
import IssueQueue from '../components/IssueQueue.vue';
import { useFlawsFetching } from '../composables/useFlawsFetching';
import { useSearchStore } from '@/stores/SearchStore';

const searchStore = useSearchStore();

const { issues, isLoading, isFinalPageFetched, total, loadFlaws, loadMoreFlaws } = useFlawsFetching();

const tableFilters = ref<Record<string, string>>({});

const showFilter = computed(() =>
  Object.keys(searchStore.searchFilters).length > 0
);

const isDefaultFilterSelected = ref<boolean>(showFilter.value);

const params = computed(() => {
  const paramsObj = {
    ...tableFilters.value,
    ...isDefaultFilterSelected.value && searchStore.searchFilters
  };

  return paramsObj;
});

watch(() => params, () => {
  loadFlaws(params);
}, {
  deep: true
});

function fetchMoreFlaws() {
  loadMoreFlaws(params);
}

function setTableFilters(newFilters: Ref<Record<string, string>>) {
  tableFilters.value = {
    ...newFilters.value
  };
}

onDeactivated(() => {
  loadFlaws(params);
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
      :defaultFilters="searchStore.searchFilters"
      @flaws:fetch="setTableFilters"
      @flaws:load-more="fetchMoreFlaws"
    />
  </main>
</template>
