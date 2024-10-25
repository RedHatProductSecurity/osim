<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted, watch } from 'vue';

import { DateTime } from 'luxon';

import IssueQueueItem from '@/components/IssueQueueItem.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';

import { useUserStore } from '@/stores/UserStore';
import { FlawClassificationStateEnum } from '@/generated-client';

const props = defineProps<{
  isFinalPageFetched: boolean;
  isLoading: boolean;
  issues: any[];
  total: number;
}>();
const emit = defineEmits(['flaws:fetch', 'flaws:load-more']);
const userStore = useUserStore();

type FilteredIssue = {
  issue: any;
  selected: boolean;
};

// Temporarily hiding 'Source' column to avoid displaying incorrect information.
// TODO: unhide it once final issue sources are defined. [OSIDB-2424]
// type ColumnField = 'id' | 'impact' | 'source' | 'created_dt' | 'title' | 'state' | 'owner';
type ColumnField = 'created_dt' | 'id' | 'impact' | 'owner' | 'state' | 'title';

const issues = computed<any[]>(() => props.issues.map(relevantFields));
const selectedSortField = ref<ColumnField | null>('created_dt');
const isSortedByAscending = ref(false);
const isMyIssuesSelected = ref(false);
const isOpenIssuesSelected = ref(false);
const tableContainerEl = ref<HTMLElement | null>(null);

const filteredStates = computed(() => {
  const allStates = Object.values(FlawClassificationStateEnum);
  return allStates
    .filter(
      state =>
        state !== FlawClassificationStateEnum.Done
        && state !== FlawClassificationStateEnum.Rejected
        && state !== FlawClassificationStateEnum.Empty,
    )
    .join(',');
});

const params = computed(() => {
  const paramsObj: Record<string, any> = {};

  if (isMyIssuesSelected.value && userStore.jiraUsername !== '') {
    paramsObj.owner = userStore.jiraUsername;
  }

  if (isOpenIssuesSelected.value) {
    paramsObj.workflow_state = filteredStates.value;
  }

  if (selectedSortField.value) {
    const sortOrderPrefix = isSortedByAscending.value ? '' : '-';
    paramsObj.order = {
      [selectedSortField.value]: `${sortOrderPrefix}${selectedSortField.value}`,
      id: `${sortOrderPrefix}cve_id,${sortOrderPrefix}uuid`,
      state: `${sortOrderPrefix}workflow_state`,
    }[selectedSortField.value];
  }

  return paramsObj;
});

const columnsFieldsMap: Record<string, ColumnField> = {
  ID: 'id',
  Impact: 'impact',
  // Source: 'source',
  Created: 'created_dt',
  Title: 'title',
  State: 'state',
  Owner: 'owner',
};

const relevantIssues = computed<FilteredIssue[]>(() => {
  return issues.value
    .map(issue => reactive({ issue, selected: false }));
});

function selectSortField(field: ColumnField) {
  // Toggle between descending, ascending and no ordering
  // If selecting a new field, set to descending
  if (selectedSortField.value === field) {
    if (!isSortedByAscending.value) {
      isSortedByAscending.value = true;
    } else {
      selectedSortField.value = null;
    }
  } else {
    isSortedByAscending.value = false;
    selectedSortField.value = field;
  }
}

function relevantFields(issue: any) {
  return {
    id: issue.cve_id || issue.uuid,
    impact: issue.impact,
    // source: issue.source,
    created_dt: issue.created_dt,
    title: issue.title,
    workflowState: issue.classification.state,
    unembargo_dt: issue.unembargo_dt,
    embargoed: issue.embargoed,
    owner: issue.owner,
    formattedDate: DateTime.fromISO(issue.created_dt).toUTC().toFormat('yyyy-MM-dd'),
  };
}

onMounted(() => {
  tableContainerEl.value?.addEventListener('scroll', handleScroll); // AutoScroll Option
  emit('flaws:fetch', params);
});

onUnmounted(() => {
  tableContainerEl.value?.removeEventListener('scroll', handleScroll);
});

// AutoScroll Method. Maybe have this as a user configurable option in the future?
function handleScroll() {
  if (props.isLoading || !tableContainerEl.value) return; // Do not load more if already loading

  const totalHeight = tableContainerEl.value.scrollHeight;
  const scrollPosition = tableContainerEl.value.scrollTop + tableContainerEl.value.clientHeight;
  // Trigger loading more content when the user has scrolled to 99% of the container's height,
  if (scrollPosition >= totalHeight * 0.99) {
    emitLoadMore();
  }
}

function emitLoadMore() {
  emit('flaws:load-more', params);
}

watch(params, () => {
  emit('flaws:fetch', params);
});
</script>

<template>
  <div class="osim-content container-fluid osim-issue-queue">
    <div class="osim-incident-filter">
      <LabelCheckbox v-model="isMyIssuesSelected" label="My Issues" class="d-inline-block" />
      <LabelCheckbox v-model="isOpenIssuesSelected" label="Open Issues" class="d-inline-block" />
      <div v-if="isLoading" class="d-inline-block float-end">
        <span
          class="spinner-border spinner-border-sm"
          role="status"
        >
          <span class="visually-hidden">Loading...</span>
        </span>
        <span> Loading Flaws&hellip; </span>
      </div>
      <span
        v-if="issues.length"
        class="float-end"
        :class="{'text-secondary': isLoading}"
      > Loaded {{ issues.length }} of {{ total }}</span>
    </div>
    <div ref="tableContainerEl" class="osim-incident-list">
      <table class="table align-middle" :class="{ 'osim-table-loading': isLoading }">
        <thead class="sticky-top">
          <!-- <thead class=""> -->
          <tr>
            <th
              v-for="(field, columnName) in columnsFieldsMap"
              :key="columnName"
              @click="selectSortField(field)"
            >
              {{ columnName }}
              <i
                :class="{
                  'opacity-0': selectedSortField !== field,
                  'bi-caret-up-fill': isSortedByAscending,
                  'bi-caret-down-fill': !isSortedByAscending,
                }"
                class="bi"
              >
              </i>
            </th>
          </tr>
        </thead>
        <tbody class="table-group-divider">
          <template v-for="(relevantIssue, index) of relevantIssues" :key="relevantIssue.id">
            <IssueQueueItem
              :issue="relevantIssue.issue"
              :class="{
                'osim-shaded': index % 2 === 0,
              }"
            />
          </template>
        </tbody>
      </table>
      <button
        v-if="relevantIssues.length !== 0 && !isFinalPageFetched"
        class="btn btn-primary"
        type="button"
        :disabled="isLoading"
        @click="emitLoadMore"
      >
        <span
          v-if="isLoading"
          class="spinner-border spinner-border-sm d-inline-block"
          role="status"
        >
          <span class="visually-hidden">Loading...</span>
        </span>
        <span v-if="isLoading"> Loading Flaws&hellip; </span>
        <span v-else> Load More Flaws </span>
      </button>
      <p v-if="relevantIssues.length === 0">No results.</p>
      <span v-if="isFinalPageFetched" role="status">Nothing else to load.</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/scss/redhat-brand-colors';

.osim-issue-queue {
  font-family: 'Red Hat Mono', monospace;
  width: 97.5%;
  margin-top: 0.75rem;

  // tbody
  div.osim-incident-list {
    display: block;
    max-height: calc(100vh - 164px);
    overflow-y: auto;

    &:hover::-webkit-scrollbar-thumb {
      background-color: $redhat-red-50;
    }
  }

  .osim-incident-filter {
    margin-left: -0.5rem;
  }

  .osim-default-filter {
    padding-left: 0.75rem;
    user-select: none;
  }

  &:hover i {
    color: $redhat-red-50;
  }

  table {
    table-layout: fixed;

    &.osim-table-loading {
      opacity: 0.5;
    }

    th {
      cursor: pointer;
      user-select: none;
    }

    tr td,
    tr th {
      padding: 1ch;

      &:nth-of-type(1) {
        width: 20%;
      }

      &:nth-of-type(2) {
        width: 8%;
      }

      &:nth-of-type(3) {
        width: 9.5%;
      }

      &:nth-of-type(4) {
        width: 27.5%;
      }

      &:nth-of-type(5) {
        width: 17.5%;
      }

      &:nth-of-type(6) {
        width: 17.5%;
      }
    }

    tbody:hover::-webkit-scrollbar-thumb {
      background-color: $redhat-red-50;
    }
  }
}
</style>
