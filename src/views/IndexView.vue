<script setup lang="ts">
import IssueQueue from '../components/IssueQueue.vue';
import { ref } from 'vue';
import { getFlaws } from '@/services/FlawService';

const isFinalPageFetched = ref(false);
const isLoading = ref(false);
const issues = ref<any[]>([]);
const offset = ref(0); // Added offset state variable
const pagesize = 20;

function fetchFlaws(filters: any = {}) {
  offset.value = 0;
  isFinalPageFetched.value = false;

  getFlaws(offset.value, 0, filters.value)
    .then((response) => {
      if (response.data.results.length < pagesize) {
        isFinalPageFetched.value = true;
      }
      issues.value = response.data.results;
      offset.value += pagesize; // Increase the offset for next fetch
    })
    .catch((err) => {
      console.error('IssueQueue: getFlaws error: ', err);
    });
}

function loadMoreFlaws(filters: any = {}) {
  if (isLoading.value || isFinalPageFetched.value) {
    return; // Early exit if already loading
  }
  isLoading.value = true;
  offset.value += pagesize;

  getFlaws(offset.value, pagesize, filters.value)
    .then((response) => {
      if (response.data.results.length < pagesize) {
        isFinalPageFetched.value = true;
        return;
      }
      issues.value = [...issues.value, ...response.data.results];
      offset.value += pagesize;
    })
    .catch((err) => {
      console.error('Error fetching more flaws: ', err);
    })
    .finally(() => {
      isLoading.value = false;
    });
}
</script>

<template>
  <main class="mt-3">
    <IssueQueue
      :issues="issues"
      :isLoading="isLoading"
      :isFinalPageFetched="isFinalPageFetched"
      @flaws:fetch="fetchFlaws"
      @flaws:load-more="loadMoreFlaws"
    />
  </main>
</template>
