<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import IssueQueue from '../components/IssueQueue.vue';
import { useFlaws }  from '../composables/useFlaws';
import { useSearchStore } from '@/stores/SearchStore';

const searchStore = useSearchStore();
const { issues, isLoading, isFinalPageFetched, loadFlaws, loadMoreFlaws } = useFlaws();
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


</script>

<template>
  <main class="mt-3">
    <IssueQueue
      v-model:isDefaultFilterSelected="isDefaultFilterSelected"
      :issues="issues"
      :isLoading="isLoading"
      :isFinalPageFetched="isFinalPageFetched"
      :showFilter="showFilter"
      @flaws:fetch="setTableFilters"
      @flaws:load-more="fetchMoreFlaws"
    />
  </main>
</template>
