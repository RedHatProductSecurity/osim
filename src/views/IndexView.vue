<script setup lang="ts">
import IssueQueue from '../components/IssueQueue.vue';
import { ref } from 'vue';
import { getFlaws } from '@/services/FlawService';
import { advancedSearchFlaws } from '@/services/FlawService';
import { useUserStore } from '@/stores/UserStore';

const { userName } = useUserStore();

const isFinalPageFetched = ref(false);
const isLoading = ref(false);
const issues = ref<any[]>([]);
const offset = ref(0); // Added offset state variable
const pagesize = 20;

function fetchFlaws() {
  if (isLoading.value || isFinalPageFetched.value) {
    return; // Early exit if already loading
  }
  isLoading.value = true;
  // offset.value += pagesize;1
  if (offset.value === 0) {
    issues.value = [];
  }

  getFlaws(offset.value, pagesize)
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

function fetchOwnFlaws () {
  isLoading.value = true;
  advancedSearchFlaws({ owner: userName })
    .then((response) => {
      issues.value = response.results;
    })
    .catch((err) => {
      console.error('IssueQueue: getFlaws error: ', err);
    }).finally(() => {
      isLoading.value = false;
      offset.value = 0; // Reset the offset for next fetch
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
      @flaws:fetch-own="fetchOwnFlaws"
    />
  </main>
</template>
