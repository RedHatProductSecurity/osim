<script setup lang="ts">
import { computed, ref } from 'vue';

import { usePagination } from '@/composables/usePagination';

import { capitalize, formatDateWithTimezone } from '@/utils/helpers';
import { flawFieldNamesMapping } from '@/constants/flawFields';
import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';

import LabelCollapsible from './widgets/LabelCollapsible.vue';

const props = defineProps<{
  history: null | undefined | ZodFlawHistoryItemType[];
}>();

const historyExpanded = ref(true);

const itemsPerPage = 20;
const totalPages = computed(() =>
  Math.ceil((props.history?.length || 0) / itemsPerPage),
);

const {
  changePage,
  currentPage,
  pages,
} = usePagination(totalPages, itemsPerPage);

const paginatedHistoryItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return props.history?.slice(start, end);
});

function isDateField(field: string) {
  return field.includes('_dt');
}
</script>

<template>
  <LabelCollapsible
    class="my-2"
    :class="{'pb-4': !history?.length}"
    :isExpanded="historyExpanded"
    @toggleExpanded="historyExpanded = !historyExpanded"
  >
    <template #label>
      <label class="mx-2 mb-0 form-label">
        <h4 :class="{'mb-0': !historyExpanded}">History</h4>
      </label>
    </template>
    <template v-if="!history?.length">
      <span>There are no tracked changes for this flaw.</span>
    </template>
    <div v-else class="mt-2">
      <label class="mx-2 form-label w-100">
        <template v-for="historyEntry in paginatedHistoryItems" :key="historyEntry.pgh_slug">
          <div v-if="historyEntry.pgh_diff" class="alert alert-info mb-1 p-2">
            <span>
              {{ formatDateWithTimezone(historyEntry.pgh_created_at || '') }}
              - {{ historyEntry.pgh_context?.user || 'System' }}
            </span>
            <ul class="mb-2">
              <li v-for="(diffEntry, diffKey) in historyEntry.pgh_diff" :key="diffKey">
                <div class="ms-3 pb-0">
                  <span>{{ capitalize(historyEntry.pgh_label) }}</span>
                  <span class="fw-bold">{{ ' ' + (flawFieldNamesMapping[diffKey] || diffKey) }}</span>
                  <span>{{ ': ' +
                    (isDateField(diffKey) && diffEntry[0]
                      ? formatDateWithTimezone(diffEntry[0])
                      : (diffEntry[0]?.toString() || '')
                    ) + ' '
                  }}</span>
                  <i class="bi bi-arrow-right" />
                  {{ (isDateField(diffKey) && diffEntry[1]
                    ? formatDateWithTimezone(diffEntry[1])
                    : (diffEntry[1]?.toString() || '')
                  ) }}
                </div>
              </li>
            </ul>
          </div>
        </template>
      </label>
    </div>
  </LabelCollapsible>
  <div v-if="history?.length" class="pagination-controls gap-1 my-2">
    <button
      type="button"
      tabindex="-1"
      class="btn btn-sm btn-secondary rounded-end-0"
      :disabled="currentPage === 1"
      @click="changePage(currentPage - 1)"
    >
      <i class="bi bi-arrow-left fs-5" />
    </button>
    <button
      v-for="page in pages"
      :key="page"
      tabindex="-1"
      class="osim-page-btn btn btn-sm rounded-0 btn-secondary"
      style="width: 34.8px;"
      :disabled="page === currentPage || page === '..'"
      @click.prevent="changePage(page as number)"
    >
      {{ page }}
    </button>
    <button
      type="button"
      tabindex="-1"
      class="btn btn-sm btn-secondary rounded-start-0"
      :disabled="currentPage === totalPages || totalPages === 0"
      @click.prevent="changePage(currentPage + 1)"
    >
      <i class="bi bi-arrow-right fs-5" />
    </button>
  </div>
</template>

<style scoped lang="scss">
    .pagination-controls {
  display: flex;

  button {
    height: 2rem;
    padding-block: 0;

    &.osim-page-btn:disabled {
      background-color: transparent;
      color: black;
    }
  }
}
</style>
