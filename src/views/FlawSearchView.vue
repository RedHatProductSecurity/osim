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
const { facets, getSearchParams, query } = useSearchParams();

const searchStore = useSearchStore();
const { addToast } = useToastStore();
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
  addToast({
    title: 'Default Filter',
    body: 'User\'s default filter saved',
  });
}
</script>

<template>
  <main class="mt-3">
    <IssueSearchAdvanced
      :isLoading="isLoading"
      @filter:save="saveSearch"
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
