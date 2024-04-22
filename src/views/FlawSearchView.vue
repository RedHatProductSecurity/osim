<script setup lang="ts">
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import { computed, ref, watch, type Ref } from 'vue';
import IssueQueue from '@/components/IssueQueue.vue';
import { useFlaws } from '@/composables/useFlaws';
import { useSearchParams } from '@/composables/useSearchParams';

const { issues, isLoading, isFinalPageFetched, loadFlaws, loadMoreFlaws } = useFlaws();
const { getSearchParams } = useSearchParams();

const filters = ref<Record<string, string>>({});
const tableFilters = ref<Record<string, string>>({});

defineEmits<{
  'issues:load': [any[]];
}>();

const params = computed(() => {
  const paramsObj = {
    ...filters.value,
    ...tableFilters.value,
    ...getSearchParams()
  };

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
