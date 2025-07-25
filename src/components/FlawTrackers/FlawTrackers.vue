<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';

import { ascend, descend, sortWith } from 'ramda';

import TrackerManager from '@/components/TrackerManager/TrackerManager.vue';

import { usePaginationWithSettings } from '@/composables/usePaginationWithSettings';

import { formatDate } from '@/utils/helpers';
import type { ZodTrackerType, ZodFlawType } from '@/types';
import { useSettingsStore } from '@/stores/SettingsStore';
import { trackerUrl } from '@/services/TrackerService';

type TrackerWithModule = { ps_component: string; ps_module: string } & ZodTrackerType;

const props = defineProps<{
  allTrackersCount: number;
  displayedTrackers: TrackerWithModule[];
  flaw: ZodFlawType;
}>();

const settingsStore = useSettingsStore();
const settings = ref(settingsStore.settings);

const showTrackerManager = ref(false);

const hasTrackers = computed(() => props.allTrackersCount > 0);

const showAllTrackers = ref(false);

// Sorting
const sortedTrackers = computed(() => sortTrackers(filteredTrackers.value));

type sortKeys = keyof Pick<ZodTrackerType,
  'created_dt' | 'updated_dt'
>;

const sortKey = ref<sortKeys>('created_dt');
const sortOrder = ref(ascend);

const setSort = (key: sortKeys) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === ascend ? descend : ascend;
  } else {
    sortKey.value = key;
    sortOrder.value = ascend;
  }
};

function sortTrackers(trackers: TrackerWithModule[]): TrackerWithModule[] {
  const customSortKey = sortKey.value;
  const order = sortOrder.value;

  const customSortFn = (affect: TrackerWithModule) => {
    return affect[customSortKey] || 0;
  };
  const comparator = [order<TrackerWithModule>(customSortFn)];

  return sortWith(comparator)(trackers);
}

// Trackers filters by field
const filteredTrackers = computed(() => {
  return props.displayedTrackers.filter((tracker) => {
    const matchesStatusFilter =
      statusFilter.value.length === 0 || statusFilter.value.includes(tracker.status?.toUpperCase() || 'EMPTY');
    const matchesSearchboxFilter =
      !searchboxFilter.value || searchboxResult.value.includes(tracker);
    return matchesStatusFilter && matchesSearchboxFilter;
  });
});

const trackerStatuses = computed(() => {
  const statuses = props.displayedTrackers.map(item => item.status?.toUpperCase() || 'EMPTY');
  const uniqueStatuses = [...new Set(statuses)];
  return uniqueStatuses;
});

const statusFilter = ref<string[]>([]);

const searchboxFilter = ref('');

const searchboxResult = computed(() => {
  return props.displayedTrackers.filter(
    tracker => tracker.ps_component.includes(searchboxFilter.value)
    || tracker.ps_module.includes(searchboxFilter.value),
  );
});

function toggleFilter(filterArray: Ref<string[]>, item: string) {
  const index = filterArray.value.indexOf(item);
  if (index > -1) {
    filterArray.value.splice(index, 1);
  } else {
    filterArray.value.push(item);
  }
}

function toggleStatusFilter(status: string) {
  toggleFilter(statusFilter, status);
}

// Pagination
const {
  changePage,
  currentPage,
  decreaseItemsPerPage,
  handlePerPageInput,
  increaseItemsPerPage,
  maxItemsPerPage,
  minItemsPerPage,
  pages,
  paginatedItems: paginatedTrackers,
  totalPages,
} = usePaginationWithSettings(sortedTrackers, { setting: 'trackersPerPage' });

const tableTrackers = computed(() => {
  return showAllTrackers.value ? filteredTrackers.value : paginatedTrackers.value;
});

const { settings: userSettings } = useSettingsStore();
</script>

<template>
  <div>
    <div class="affects-trackers">
      <div class="bg-dark rounded-top-2 text-info">
        <div class="affect-trackers-heading d-flex p-1 pt-2 px-3">
          <h5 class="m-0">Trackers</h5>
        </div>
        <div v-if="hasTrackers && !showAllTrackers" class="pagination-controls gap-1 ms-2">
          <button
            type="button"
            class="btn btn-sm btn-info rounded-end-0"
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
          >
            <i class="bi bi-arrow-left fs-5" />
          </button>
          <button
            v-for="page in pages"
            :key="page"
            class="osim-page-btn btn btn-sm rounded-0 btn-info"
            :disabled="page === currentPage || page === '..'"
            @click.prevent="changePage(page as number)"
          >
            {{ page }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-info rounded-start-0"
            :disabled="currentPage === totalPages || totalPages === 0"
            @click.prevent="changePage(currentPage + 1)"
          >
            <i class="bi bi-arrow-right fs-5" />
          </button>
        </div>
        <input
          v-model="searchboxFilter"
          type="text"
          class="form-control border border-info focus-ring m-2 mb-1 p-1"
          style="width: 35ch;"
          placeholder="Filter Modules/Components..."
        />
        <div class="trackers-toolbar p-2 pt-1">
          <div class="tracker-badges">
            <div
              v-if="paginatedTrackers.length > 0 && !showAllTrackers"
              class="per-page-btn btn btn-sm badge"
            >
              <i
                :style="settings.trackersPerPage > minItemsPerPage
                  ? 'pointer-events: auto;'
                  : 'opacity: 50%; pointer-events: none;'"
                class="bi bi-dash-square fs-6 my-auto"
                title="Reduce trackers per page"
                @click="decreaseItemsPerPage()"
              />
              <span class="mx-2 my-auto">Per page:</span>
              <input
                type="text"
                class="form-control mx-2"
                :value="settings.trackersPerPage"
                @input="handlePerPageInput($event)"
              />
              <i
                :style="settings.trackersPerPage < maxItemsPerPage
                  ? 'pointer-events: auto;'
                  : 'opacity: 50%; pointer-events: none;'"
                class="bi bi-plus-square fs-6 my-auto"
                title="Increase trackers per page"
                @click="increaseItemsPerPage()"
              />
            </div>
            <div
              v-if="hasTrackers"
              class="badge"
              :class="showAllTrackers ? 'bg-info' : 'bg-light-cyan'"
              style="cursor: pointer;"
              @click.stop="showAllTrackers = !showAllTrackers"
            >
              <span>Show All Trackers ({{ allTrackersCount }})</span>
            </div>
          </div>
          <button
            v-if="!showTrackerManager"
            type="button"
            class="btn btn-sm btn-info ms-auto"
            @click="showTrackerManager = true"
          >
            <i class="bi bi-binoculars" />
            Show Trackers Manager
          </button>
          <button
            v-else
            type="button"
            class="btn btn-sm btn-info ms-auto"
            @click="showTrackerManager = false"
          >
            <i class="bi bi-eye-slash-fill" />
            Hide Trackers Manager
          </button>
        </div>
      </div>
      <div
        class="osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark"
      >
        <table
          v-resizableTableColumns="userSettings.trackersColumnWidths"
          class="trackers-table table table-striped table-info mb-0"
        >
          <thead>
            <tr>
              <th>Bug ID</th>
              <th>Module</th>
              <th>Component</th>
              <th>Product Stream</th>
              <th>
                <span class="align-bottom me-1">Status</span>
                <button
                  id="status-filter"
                  type="button"
                  class="btn btn-sm border-0 p-0"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="outside"
                  aria-expanded="false"
                  @contextmenu.prevent="statusFilter = []"
                >
                  <i
                    class="bi"
                    :class="statusFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
                    :title="statusFilter.length !== 0 ? 'Filtering by some statuses' : ''"
                  />
                </button>
                <ul
                  class="dropdown-menu"
                  aria-labelledby="status-filter"
                >
                  <template v-for="status in trackerStatuses" :key="status">
                    <li><a
                      href="#"
                      class="btn py-0 dropdown-item"
                      @click.prevent="toggleStatusFilter(status)"
                    >
                      <input
                        type="checkbox"
                        class="form-check-input me-2"
                        :checked="statusFilter.includes(status)"
                        @click.stop="toggleStatusFilter(status)"
                      />
                      <span>{{ status.toUpperCase() }}</span>
                    </a></li>
                  </template>
                </ul>
              </th>
              <th>Resolution</th>
              <th
                @click="setSort('created_dt')"
              >
                Created date
                <i
                  :class="{
                    'opacity-0': sortKey !== 'created_dt',
                    'bi-caret-down-fill': sortOrder === descend,
                    'bi-caret-up-fill': sortOrder !== descend,
                  }"
                  class="bi"
                />
              </th>
              <th
                @click="setSort('updated_dt')"
              >
                Updated date
                <i
                  :class="{
                    'opacity-0': sortKey !== 'updated_dt',
                    'bi-caret-down-fill': sortOrder === descend,
                    'bi-caret-up-fill': sortOrder !== descend,
                  }"
                  class="bi"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(tracker, trackerIndex) in tableTrackers"
              :key="trackerIndex"
            >
              <td>
                <a
                  v-if="tracker.external_system_id"
                  :href="trackerUrl(tracker.type, tracker.external_system_id)"
                  target="_blank"
                >
                  {{ `${tracker.external_system_id} ` }}<i class="bi-box-arrow-up-right" />
                </a>
                <span v-else title="This tracker doesn't have External ID">
                  None
                </span>
              </td>
              <td colspan="1" :title="tracker.ps_module">{{ tracker.ps_module }}</td>
              <td colspan="1" :title="tracker.ps_component">{{ tracker.ps_component }}</td>
              <td colspan="1" :title="tracker.ps_update_stream ?? ''">{{ tracker.ps_update_stream }}</td>
              <td colspan="1">{{ tracker.status?.toUpperCase() || 'EMPTY' }}</td>
              <td colspan="1">{{ tracker.resolution?.toUpperCase() }}</td>
              <td colspan="1">{{ formatDate(tracker.created_dt ?? '', true) }}</td>
              <td colspan="1">{{ formatDate(tracker.updated_dt ?? '', true) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="sortedTrackers.length === 0">
          No trackers to display
        </div>
        <TrackerManager
          v-if="showTrackerManager"
          :flaw="flaw"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang=scss>
@import '@/scss/bootstrap-overrides';

.affects-trackers {
  .pagination-controls {
    display: flex;

    button {
      height: 2rem;
      padding-block: 0;
    }

    .osim-page-btn {
      width: 34.8px;
    }
  }

  .osim-tracker-card {
    div {
      padding: 0.5rem;
      background-color: $light-info;
    }
  }

  .trackers-toolbar {
    display: flex;

    button {
      height: 2rem;
      padding-block: 0;

      &.osim-page-btn:disabled {
        background-color: transparent;
        color: $info;
      }
    }

    .tracker-badges {
      display: flex;
      margin-block: 0;
      gap: 0.25rem;

      .per-page-btn {
        display: flex;
        padding-block: 0;

        input {
          width: 3rem;
        }
      }

      .badge {
        height: 28px;
        border-radius: 0.25rem;
        background-color: $light-info;
        color: black;
        margin-block: auto;
        user-select: none;

        span {
          font-size: 0.75rem;
          vertical-align: middle;
          text-align: center;
        }
      }
    }

    .affects-table-actions {
      button {
        margin-inline: 0.1rem;
      }
    }
  }

  table {
    thead {
      z-index: 1;

      .dropdown-menu {
        z-index: 10;
      }

      th {
        position: relative;
        user-select: none;
        text-wrap: nowrap;

        tr th {
          user-select: none;

          #status-filter .bi {
            font-size: 1rem;
          }

          &:nth-of-type(7),
          &:nth-of-type(8) {
            cursor: pointer;
          }
        }
      }
    }

    td {
      padding: 0.25rem;
      padding-left: 0.5rem;
    }

    tbody {
      tr td {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }
    }
  }
}
</style>
