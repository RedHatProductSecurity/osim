<script setup lang="ts">
import IssueQueue from '../components/IssueQueue.vue';
import { useFlaws }  from '../composables/useFlaws';

const { issues, isLoading, isFinalPageFetched, loadFlaws, loadMoreFlaws } = useFlaws();

</script>

<template>
  <main class="mt-3">
    <IssueQueue
      :issues="issues"
      :isLoading="isLoading"
      :isFinalPageFetched="isFinalPageFetched"
      @flaws:fetch="loadFlaws"
      @flaws:load-more="loadMoreFlaws"
    />
  </main>
</template>
