<script setup lang="ts">
import { computed, onDeactivated, onMounted, ref, watch, type Ref } from 'vue';

import IssueQueue from '@/components/IssueQueue.vue';

import { useFlawsFetching } from '@/composables/useFlawsFetching';

import { useSearchStore } from '@/stores/SearchStore';

const searchStore = useSearchStore();

const { isFinalPageFetched, isLoading, issues, loadFlaws, loadMoreFlaws, total } = useFlawsFetching();

const tableFilters = ref<Record<string, string>>({});

const showSavedSearches = ref(true);
const loadedSearch = ref<number>(-1);

const params = computed(() => {
  const paramsObj = {
    ...tableFilters.value,
    ...loadedSearch.value !== -1 && searchStore.savedSearches[loadedSearch.value].searchFilters,
    ...loadedSearch.value !== -1 && { query: searchStore.savedSearches[loadedSearch.value].queryFilter },
  };

  return paramsObj;
});

onMounted(() => {
  if (searchStore.defaultSearch) {
    loadedSearch.value = searchStore.savedSearches.findIndex(search => search.default);
  }
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

function selectSavedSearch(index: number) {
  if (loadedSearch.value === index) {
    loadedSearch.value = -1;
    return;
  }

  loadedSearch.value = index;
}
</script>

<template>
  <main class="mt-3">
    <details
      :open="showSavedSearches"
      class="osim-advanced-search-container container-fluid ms-3 ps-3"
    >
      <summary @click="showSavedSearches === true"> Saved Searches</summary>
      <div class="d-flex mt-2">
        <template v-for="(savedSearch, index) in searchStore.savedSearches" :key="index">
          <button
            :title="'Query: ' + savedSearch.queryFilter + '\nFields: '
              + Object.entries(savedSearch.searchFilters).map(([key, value]) => `${key}: ${value}`).join(', ')"
            class="btn me-2"
            :class="index === loadedSearch ? 'btn-secondary' : 'border'"
            type="button"
            @click="selectSavedSearch(index)"
          >
            {{ savedSearch.name }}
            <i
              class="bi ms-2"
              :class="savedSearch.default ? 'bi-star-fill' : 'bi-star'"
              @click.stop="searchStore.setDefaultSearch(index)"
            />
          </button>
        </template>
      </div>
      <span v-if="searchStore.savedSearches.length === 0" class="ms-2">No saved searches</span>
    </details>
    <IssueQueue
      :issues="issues"
      :isLoading="isLoading"
      :total="total"
      :isFinalPageFetched="isFinalPageFetched"
      @flaws:fetch="setTableFilters"
      @flaws:load-more="fetchMoreFlaws"
    />
  </main>
</template>

<style scoped lang="scss">
details {
  user-select: none;
  summary {
    width: fit-content;
  }
}
</style>
