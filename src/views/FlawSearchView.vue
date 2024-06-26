<script setup lang="ts">
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import { computed, ref, watch, type Ref } from 'vue';
import IssueQueue from '@/components/IssueQueue.vue';
import { useFlawsFetching } from '@/composables/useFlawsFetching';
import { useSearchParams } from '@/composables/useSearchParams';
import { useSearchStore } from '@/stores/SearchStore';
import { useToastStore } from '@/stores/ToastStore';
import { allowedEmptyFieldMapping } from '@/constants/flawFields';

const { issues, isLoading, isFinalPageFetched, total, loadFlaws, loadMoreFlaws } = useFlawsFetching();
const { getSearchParams, facets } = useSearchParams();

const searchStore = useSearchStore();
const { addToast } = useToastStore();
const tableFilters = ref<Record<string, string>>({});

defineEmits<{
  'issues:load': [any[]];
}>();

const params = computed(() => {
  const paramsObj = {
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

function saveFilter() {
  const filters = facets.value.reduce(
    (fields, { field, value }) => {
      if (field && value || allowedEmptyFieldMapping[field]) {
        fields[field] = value;
      }
      return fields;
    },
      {} as Record<string, string>,
  );
  searchStore.saveFilter(filters);
  addToast({
    title: 'Default Filter',
    body: 'User\'s default filter saved',
  });
}

</script>

<template>
  <main class="mt-3">
    <div class="container">
      <IssueSearchAdvanced
        :isLoading="isLoading"
        @filter:save="saveFilter"
      />
    </div>
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
