<script setup lang="ts">
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import { z } from 'zod';
import { computed, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import IssueQueue from '@/components/IssueQueue.vue';
import { useFlaws }  from '../composables/useFlaws';

const { issues, isLoading, isFinalPageFetched, loadFlaws, loadMoreFlaws } = useFlaws();

const route = useRoute();

const filters = ref<Record<string, string>>({});
const tableFilters = ref<Record<string, string>>({});

defineProps<{
  query: string;
}>();
defineEmits<{
  'issues:load': [any[]];
}>();

const searchQuery = z.object({
  query: z.object({
    query: z.string().nullish(),
  }),
});

const params = computed(() => {
  const parsedRoute = searchQuery.parse(route);
  const paramsObj = {
    ...filters.value,
    ...tableFilters.value
  };
  if (parsedRoute.query.query) {
    paramsObj.search = parsedRoute.query.query;
  }
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

function setFilters(newFilters : Record<string, string> ) {
  filters.value = {
    ...newFilters
  };
}

function setTableFilters(newFilters: Ref<Record<string, string>>) {
  tableFilters.value = {
    ...newFilters.value
  };
}

</script>

<template>
  <main class="mt-3">
    <div class="container">
      <IssueSearchAdvanced 
        :isLoading="isLoading"
        @set:filters="setFilters"
      />
    </div>
    <!-- <IssueSearch :query="query" /> -->
    <IssueQueue
      :issues="issues"
      :isLoading="isLoading"
      :isFinalPageFetched="isFinalPageFetched"
      @flaws:fetch="setTableFilters"
      @flaws:load-more="fetchMoreFlaws"
    />
  </main>
</template>
