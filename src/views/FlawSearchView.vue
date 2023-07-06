<script setup lang="ts">
import IssueSearch from '@/components/IssueSearch.vue';

defineProps<{
  query: string,
}>()

</script>

<template>
  <main class="mt-3">
    <IssueSearch :query="query"/>
  </main>
</template>
