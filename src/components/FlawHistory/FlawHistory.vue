<script setup lang="ts">
import { computed, ref } from 'vue';

import { usePagination } from '@/composables/usePagination';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import EditableDate from '@/widgets/EditableDate/EditableDate.vue';
import { capitalize, formatDateWithTimezone } from '@/utils/helpers';
import { flawFieldNamesMapping } from '@/constants/flawFields';
import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';
import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';

const props = withDefaults(defineProps<{
  error?: boolean;
  history: null | undefined | ZodFlawHistoryItemType[];
}>(), {
  error: false,
});

const { getFieldAegisType, isFieldAegisChange } = useAegisMetadataTracking();

const isLoading = computed(() => props.history === undefined || props.history === null);

const startDate = ref<null | string | undefined>(null);
const endDate = ref<null | string | undefined>(null);

const emptyFilters = computed(() => {
  return !startDate.value && !endDate.value;
});

const validDateRange = computed(() => {
  const start = startDate.value ? new Date(startDate.value) : null;
  const end = endDate.value ? new Date(endDate.value) : null;

  return (
    start instanceof Date && !Number.isNaN(start.getTime())
    && end instanceof Date && !Number.isNaN(end.getTime())
    && end >= start
  );
});

const filteredHistoryItems = computed(() => {
  if (!validDateRange.value) {
    return props.history;
  }

  const start = new Date(startDate.value!);
  const end = new Date(endDate.value!);
  end.setDate(end.getDate() + 1);

  return props.history?.filter((item) => {
    if (!item.pgh_created_at) return false;

    const itemDate = new Date(item.pgh_created_at);

    return itemDate.getTime() >= start.getTime() && itemDate.getTime() <= end.getTime();
  });
});

const historyExpanded = ref(true);

const itemsPerPage = 20;
const totalPages = computed(() =>
  Math.ceil((filteredHistoryItems.value?.length || 0) / itemsPerPage),
);

const {
  changePage,
  currentPage,
  pages,
} = usePagination(totalPages, itemsPerPage);

const paginatedHistoryItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredHistoryItems.value?.slice(start, end);
});

function isDateField(field: string) {
  return field.includes('_dt');
}

function clearFilters() {
  startDate.value = null;
  endDate.value = null;
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
    <template v-if="isLoading">
      <div class="d-flex align-items-center gap-2">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading history...</span>
        </div>
        <span class="text-muted">Loading history...</span>
      </div>
    </template>
    <template v-else-if="error">
      <div class="alert alert-warning mb-0 d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>Failed to load history. Please try refreshing the page.</span>
      </div>
    </template>
    <template v-else-if="!history?.length">
      <span>There are no tracked changes for this flaw.</span>
    </template>
    <template v-else>
      <div class="d-flex mb-2 gap-2">
        <button
          tabindex="-1"
          type="button"
          :disabled="emptyFilters"
          class="input-group-text"
          @click="clearFilters()"
          @mousedown="event => event.preventDefault()"
        >
          <i class="bi bi-eraser"></i>
        </button>
        <EditableDate
          v-model="startDate as string"
          style="width: 225px;"
          placeholder="[Start date]"
        />
        <EditableDate
          v-model="endDate as string"
          style="width: 225px;"
          placeholder="[End date]"
        />
      </div>
      <template v-if="!filteredHistoryItems?.length">
        <span>There are no results for current filter.</span>
      </template>
      <div v-else class="mt-2">
        <div class="mt-2">
          <template v-for="historyEntry in paginatedHistoryItems" :key="historyEntry.pgh_slug">
            <div v-if="historyEntry.pgh_diff" class="alert alert-info mb-1 p-2">
              <span>
                {{ formatDateWithTimezone(historyEntry.pgh_created_at || '', true) }}
                - {{ historyEntry.pgh_context?.user || 'System' }}
              </span>
              <ul class="mb-2">
                <li
                  v-for="(diffEntry, diffKey) in historyEntry.pgh_diff"
                  v-show="diffKey !== 'aegis_meta'"
                  :key="diffKey"
                >
                  <div class="ms-3 pb-0">
                    <span
                      v-if="isFieldAegisChange(historyEntry, diffKey)"
                      class="badge bg-secondary me-2"
                      style="cursor: default;"
                      :title="getFieldAegisType(historyEntry, diffKey) === 'AI'
                        ? 'This change was suggested by Aegis-AI'
                        : 'This change was a modified Aegis-AI suggestion'"
                      data-bs-toggle="tooltip"
                    >
                      <i class="bi bi-robot"></i> {{ getFieldAegisType(historyEntry, diffKey) }}
                    </span>
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
        </div>
      </div>
    </template>
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
