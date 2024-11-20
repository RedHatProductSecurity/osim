<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';

import IssueSearchAdvanced from '@/components/IssueSearchAdvanced/IssueSearchAdvanced.vue';
import IssueQueue from '@/components/IssueQueue/IssueQueue.vue';

import { useFlawsFetching } from '@/composables/useFlawsFetching';
import { useSearchParams } from '@/composables/useSearchParams';

const { isFinalPageFetched, isLoading, issues, loadFlaws, loadMoreFlaws, total } = useFlawsFetching();
const { getSearchParams } = useSearchParams();

const tableFilters = ref<Record<string, string>>({});

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
</script>

<template>
  <main class="mt-3">
    <IssueSearchAdvanced
      :isLoading="isLoading"
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
