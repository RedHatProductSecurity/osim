<script setup lang="ts">
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import { z } from 'zod';
import { searchFlaws } from '../services/FlawService';
import { onMounted, watch, ref } from 'vue';
import { useRoute } from 'vue-router';
import IssueQueue from '@/components/IssueQueue.vue';

const route = useRoute();

defineProps<{
  query: string;
}>();

const issues = ref<any[]>([]);
const isLoading = ref(false);

const searchQuery = z.object({
  query: z.object({
    query: z.string(),
  }),
});

function search() {
  try {
    const parsedRoute = searchQuery.parse(route);
    if (parsedRoute.query.query === '') {
      // TODO handle error
      return;
    }
    isLoading.value = true;
    searchFlaws(parsedRoute.query.query)
      .then((response) => {
        console.log('IssueSearch: got flaws: ', response.data);
        issues.value = response.results;
      })
      .catch((err) => {
        console.error('IssueSearch: getFlaws error: ', err);
      })
      .finally(() => {
        isLoading.value = false;
      });
  } catch (e) {
    console.log('IssueSearch: error advanced searching', e);
    isLoading.value = false;
  }
}

onMounted(search);
watch(() => route.query?.query, search);

function setIssues(loadedIssues: []) {
  issues.value = loadedIssues;
}
</script>

<template>
  <main class="mt-3">
    <div class="container">
      <IssueSearchAdvanced :setIssues="setIssues" />
    </div>
    <!-- <IssueSearch :query="query" /> -->
    <IssueQueue :issues="issues" :isLoading="isLoading" />
  </main>
</template>
