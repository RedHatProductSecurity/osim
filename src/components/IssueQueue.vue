<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted, watch } from 'vue';
import { DateTime } from 'luxon';
import IssueQueueItem from '@/components/IssueQueueItem.vue';
import LabelCheckbox from './widgets/LabelCheckbox.vue';
import { useUserStore } from '@/stores/UserStore';
import { FlawClassificationStateEnum } from '../generated-client';
const { userName } = useUserStore();

const emit = defineEmits(['flaws:fetch', 'flaws:load-more']);

type FilteredIssue = {
  issue: any;
  selected: boolean;
};

type ColumnField = 'id' | 'impact' | 'source' | 'created_dt' | 'title' | 'state' | 'owner';

const props = defineProps<{
  issues: any[];
  isLoading: boolean;
  isFinalPageFetched: boolean;
}>();

const issues = computed<any[]>(() => props.issues.map(relevantFields));
const issueFilter = ref('');
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

const filters = computed(() => {
  const filterObj: Record<string, any> = {};

  if (isMyIssuesSelected.value) {
    filterObj.owner = userName;
  }

  if (isOpenIssuesSelected.value) {
    filterObj.workflow_state = filteredStates.value;
  }

  return filterObj;
});

const columnsFieldsMap: Record<string, ColumnField> = {
  ID: 'id',
  Impact: 'impact',
  Source: 'source',
  Created: 'created_dt',
  Title: 'title',
  State: 'state',
  Owner: 'owner',
};

const relevantIssues = computed<FilteredIssue[]>(() => {
  const filterCaseInsensitive = issueFilter.value.toLowerCase();
  const wontUseFilter = issueFilter.value.length === 0;
  return issues.value
    .filter(
      (issue: any) =>
        wontUseFilter ||
        [issue.title, issue.cve_id, issue.state, issue.source].some(
          (text) => text && text.toLowerCase().includes(filterCaseInsensitive),
        ),
    )
    .sort((a: any, b: any) =>
      isSortedByAscending.value
        ? a[selectedSortField.value].localeCompare(b[selectedSortField.value])
        : b[selectedSortField.value].localeCompare(a[selectedSortField.value]),
    )
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
    source: issue.source,
    created_dt: issue.created_dt,
    title: issue.title,
    state: issue.state,
    unembargo_dt: issue.unembargo_dt,
    embargoed: issue.embargoed,
    owner: issue.owner,
    formattedDate: DateTime.fromISO(issue.created_dt).toFormat('yyyy-MM-dd'),
  };
}

onMounted(() => {
  tableContainerEl.value?.addEventListener('scroll', handleScroll); // AutoScroll Option
  emit('flaws:fetch', filters);
});

onUnmounted(() => {
  tableContainerEl.value?.removeEventListener('scroll', handleScroll);
});

// AutoScroll Method. Maybe have this as a user configurable option in the future?
function handleScroll() {
  if (props.isLoading || !tableContainerEl.value) return; // Do not load more if already loading

  const totalHeight = tableContainerEl.value.scrollHeight;
  const scrollPosition = tableContainerEl.value.scrollTop + tableContainerEl.value.clientHeight;

  if (scrollPosition >= totalHeight) {
    emitLoadMore();
  }
}

function emitLoadMore() {
  emit('flaws:load-more', filters);
}

watch(filters, () => {
  emit('flaws:fetch', filters);
});
</script>

<template>
  <div class="osim-content container osim-issue-queue">
    <div class="osim-incident-filter">
      <label>
        <!--Filter By-->
        <!--<select>-->
        <!--  <option value="Issues assigned to Me">Issues assigned to Me</option>-->
        <!-- <option value="Issues assigned to team but unowned">
          Issues assigned to team but unowned
        </option> -->
        <!--  <option value="Oldest">Oldest</option>-->
        <!--  <option value="Newest">Newest</option>-->
        <!--</select>-->

        <input
          v-model="issueFilter"
          type="text"
          class="form-text form-control"
          placeholder="Filter Issues/Flaws"
        />
      </label>
      <LabelCheckbox v-model="isMyIssuesSelected" label="My Issues" class="d-inline-block" />
      <LabelCheckbox v-model="isOpenIssuesSelected" label="Open Issues" class="d-inline-block" />

      <span
        v-if="isLoading"
        class="spinner-border spinner-border-sm d-inline-block ms-3"
        role="status"
      >
        <span class="visually-hidden">Loading...</span>
      </span>
      <span v-if="isLoading"> Loading Flaws&hellip; </span>
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
              :class="{ 'osim-issue-queue-table-created': columnName === 'Created' }"
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
        v-if="!isFinalPageFetched"
        class="btn btn-primary ms-4"
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
    overflow-y: scroll;

    &:hover::-webkit-scrollbar-thumb {
      background-color: $redhat-red-50;
    }
  }

  &:hover i {
    color: $redhat-red-50;
  }

  table {
    &.osim-table-loading {
      opacity: 0.5;
    }

    th {
      cursor: pointer;
      user-select: none;
    }

    tr td,
    tr th {
      &:not(:first-child) {
        min-width: 12ch;
      }
    }

    tbody:hover::-webkit-scrollbar-thumb {
      background-color: $redhat-red-50;
    }
  }
}
</style>
