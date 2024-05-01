<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted, watch } from 'vue';
import { DateTime } from 'luxon';
import IssueQueueItem from '@/components/IssueQueueItem.vue';
import LabelCheckbox from './widgets/LabelCheckbox.vue';
import { useUserStore } from '@/stores/UserStore';
import { FlawClassificationStateEnum } from '../generated-client';
const userStore = useUserStore();

const emit = defineEmits(['flaws:fetch', 'flaws:load-more']);

type FilteredIssue = {
  issue: any;
  selected: boolean;
};

// Temporarily hiding 'Source' column to avoid displaying incorrect information.
// TODO: unhide it once final issue sources are defined. [OSIDB-2424]
// type ColumnField = 'id' | 'impact' | 'source' | 'created_dt' | 'title' | 'state' | 'owner'; 
type ColumnField = 'id' | 'impact' | 'created_dt' | 'title' | 'state' | 'owner';

const props = defineProps<{
  issues: any[];
  isLoading: boolean;
  isFinalPageFetched: boolean;
  showFilter?: boolean
  total: number
}>();

const isDefaultFilterSelected = defineModel<boolean>('isDefaultFilterSelected', { default: true });

const issues = computed<any[]>(() => props.issues.map(relevantFields));
const selectedSortField = ref<ColumnField>('created_dt');
const isSortedByAscending = ref(false);
const isMyIssuesSelected = ref(false);
const isOpenIssuesSelected = ref(false);
const tableContainerEl = ref<HTMLElement | null>(null);

const filteredStates = computed(() => {
  const allStates = Object.values(FlawClassificationStateEnum);
  return allStates
    .filter(
      (state) =>
        state !== FlawClassificationStateEnum.Done &&
        state !== FlawClassificationStateEnum.Rejected,
    )
    .join(',');
});

const params = computed(() => {
  const paramsObj: Record<string, any> = {};

  if (isMyIssuesSelected.value) {
    paramsObj.owner = userStore.userName;
  }

  if (isOpenIssuesSelected.value) {
    paramsObj.workflow_state = filteredStates.value;
  }

  const sortOrderPrefix = isSortedByAscending.value ? '' : '-';
  paramsObj.order = {
    [selectedSortField.value]: `${sortOrderPrefix}${selectedSortField.value}`,
    id: `${sortOrderPrefix}cve_id,${sortOrderPrefix}uuid`,
    state: `${sortOrderPrefix}workflow_state`,
  }[selectedSortField.value];
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
    .map((issue) => reactive({ issue, selected: false }));
});

function updateSelectAll(selectedAll: boolean) {
  for (const filteredIssue of relevantIssues.value) {
    filteredIssue.selected = selectedAll;
  }
}

function selectSortField(field: ColumnField) {
  isSortedByAscending.value =
    selectedSortField.value === field ? !isSortedByAscending.value : false;
  selectedSortField.value = field;
}

const isSelectAllIndeterminate = computed(() => {
  if (relevantIssues.value.length === 0) {
    return false;
  }
  return relevantIssues.value.some((it) => it.selected !== relevantIssues.value[0].selected);
});

const isSelectAllChecked = computed(() => {
  return relevantIssues.value.every((it) => it.selected);
});

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
    formattedDate: DateTime.fromISO(issue.created_dt).toFormat('yyyy-MM-dd'),
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
  <div class="osim-content container osim-issue-queue">
    <div class="osim-incident-filter">
      <LabelCheckbox v-model="isMyIssuesSelected" label="My Issues" class="d-inline-block" />
      <LabelCheckbox v-model="isOpenIssuesSelected" label="Open Issues" class="d-inline-block" />
      <LabelCheckbox
        v-if="showFilter"
        v-model="isDefaultFilterSelected"
        label="Default Filters"
        class="d-inline-block"
      />

      <span
        v-if="isLoading"
        class="spinner-border spinner-border-sm d-inline-block ms-3"
        role="status"
      >
        <span class="visually-hidden">Loading...</span>
      </span>
      <span v-if="isLoading"> Loading Flaws&hellip; </span>
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
            <th>
              <input
                type="checkbox"
                class="form-check-input"
                :indeterminate="isSelectAllIndeterminate"
                :checked="isSelectAllChecked"
                aria-label="Select All Issues in Table"
                @change="updateSelectAll(($event.target as HTMLInputElement).checked)"
              />
            </th>
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
              v-model:selected="relevantIssue.selected"
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
        // min-width: 1ch;
        // max-width: 1ch;
        // min-width: 2.5%;
        // max-width: 2.5%;
        width: 2.5%;
      }

      &:nth-of-type(2) {
        // min-width: 15ch;
        // max-width: 15ch;
        // min-width: 12.5%;
        // max-width: 12.5%;
        width: 12.5%;
      }

      &:nth-of-type(3) {
        // min-width: 11ch;
        // max-width: 11ch;
        // min-width: 8.5%;
        // max-width: 8.5%;
        width: 8.5%;
      }

      &:nth-of-type(4) {
        // min-width: 12ch;
        // max-width: 12ch;
        // min-width: 9.5%;
        // max-width: 9.5%;
        width: 9.5%;
      }
      
      //&:nth-of-type(5) {
      //  // min-width: 12ch;
      //  // max-width: 12ch;
      //  // min-width: 9.5%;
      //  // max-width: 9.5%;
      //  width: 9.5%;
      //}

      &:nth-of-type(5) {
        // min-width: 12ch;
        // max-width: 12ch;
        // min-width: 32%;
        // max-width: 32%;
        width: 32%;
      }
      
      &:nth-of-type(6) {
        // min-width: 10ch;
        // max-width: 10ch;
        // min-width: 8.5%;
        // max-width: 8.5%;
        width: 8.5%;
      }
      
      &:nth-of-type(8) {
        // min-width: 20ch;
        // max-width: 20ch;
        // min-width: 17%;
        // max-width: 17%;
        width: 17%;
      }
    }

    tbody:hover::-webkit-scrollbar-thumb {
      background-color: $redhat-red-50;
    }
  }
}
</style>
