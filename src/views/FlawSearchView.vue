<script setup lang="ts">
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import { z } from 'zod';
import { computed, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import IssueQueue from '@/components/IssueQueue.vue';
import { useFlaws } from '@/composables/useFlaws';
import { flawFields } from '@/utils/flawFields';

const { issues, isLoading, isFinalPageFetched, loadFlaws, loadMoreFlaws } = useFlaws();

const route = useRoute();

const filters = ref<Record<string, string>>({});
const tableFilters = ref<Record<string, string>>({});

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
  if (route.query && Object.keys(route.query).length > 0) {
    Object.keys(route.query).forEach(key => {
      if (flawFields.includes(key) && typeof route.query[key] === 'string') {
        paramsObj[key] =  route.query[key]as string;
      }
    });
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
