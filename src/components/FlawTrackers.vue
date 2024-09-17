<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';

import { ascend, descend, sortWith } from 'ramda';

import TrackerManager from '@/components/TrackerManager.vue';

import { usePagination } from '@/composables/usePagination';

import { formatDate } from '@/utils/helpers';
import type { ZodAffectType, ZodTrackerType } from '@/types/zodAffect';
import { useSettingsStore } from '@/stores/SettingsStore';
import { trackerUrl } from '@/services/TrackerService';

type TrackerWithModule = { ps_module: string } & ZodTrackerType;

const props = defineProps<{
  affectsNotBeingDeleted: ZodAffectType[];
  allTrackersCount: number;
  displayedTrackers: TrackerWithModule[];
  flawId: string;
}>();

const emit = defineEmits<{
  'affects:refresh': [];
  'file-tracker': [value: object];
}>();

const settingsStore = useSettingsStore();
const settings = ref(settingsStore.settings);

const showTrackerManager = ref(false);

const hasTrackers = computed(() => props.allTrackersCount > 0);

// Sorting
const sortedTrackers = computed(() =>
  sortTrackers(filteredTrackers.value),
);

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
      statusFilter.value.length === 0 || statusFilter.value.includes(tracker.status ?? 'EMPTY');
    return matchesStatusFilter;
  });
});

const trackerStatuses = computed(() => {
  const statuses = props.displayedTrackers.map(item => item.status?.toUpperCase() || 'EMPTY');
  const uniqueStatuses = [...new Set(statuses)];
  return uniqueStatuses;
});

const statusFilter = ref<string[]>([]);

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

// Trackers pagination
const totalPages = computed(() =>
  Math.ceil(sortedTrackers.value.length / settings.value.trackersPerPage),
);

const minItemsPerPage = 5;
const maxItemsPerPage = 20;
const {
  changePage,
  currentPage,
  pages,
} = usePagination(totalPages, settings.value.trackersPerPage);

const paginatedTrackers = computed(() => {
  const start = (currentPage.value - 1) * settings.value.trackersPerPage;
  const end = start + settings.value.trackersPerPage;
  return sortedTrackers.value.slice(start, end);
});

function reduceItemsPerPage() {
  if (settings.value.trackersPerPage > minItemsPerPage) {
    settings.value.trackersPerPage--;
  }
}

function increaseItemsPerPage() {
  if (settings.value.trackersPerPage < maxItemsPerPage) {
    settings.value.trackersPerPage++;
  }
}
</script>

<template>
  <div>
    <div class="affects-trackers">
      <div class="bg-dark rounded-top-2 text-info">
        <div class="affect-trackers-heading d-flex p-1 pt-2 px-3">
          <h5 class="m-0">Trackers</h5>
        </div>
        <div v-if="hasTrackers" class="pagination-controls gap-1 ms-2">
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
        <div class="trackers-toolbar p-2 pt-1">
          <div class="tracker-badges">
            <div
              v-if="paginatedTrackers.length > 0"
              class="per-page-btn btn btn-sm badge"
            >
              <i
                :style="settings.trackersPerPage > minItemsPerPage
                  ? 'pointer-events: auto;'
                  : 'opacity: 50%; pointer-events: none;'"
                class="bi bi-dash-square fs-6 my-auto"
                title="Reduce trackers per page"
                @click="reduceItemsPerPage()"
              />
              <span class="mx-2 my-auto">{{ `Per page: ${settings.trackersPerPage}` }}</span>
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
              title="All trackers in this flaw"
            >
              <span>All trackers {{ allTrackersCount }}</span>
            </div>
            <div
              v-if="paginatedTrackers.length > 0"
              class="badge"
              title="Trackers displayed in current page"
            >
              <span>Displaying {{ paginatedTrackers.length }}</span>
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
        <table class="table table-striped table-info mb-0">
          <thead class="sticky-top">
            <tr>
              <th>Bug ID</th>
              <th>Module</th>
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
              v-for="(tracker, trackerIndex) in paginatedTrackers"
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
              <td>{{ tracker.ps_module }}</td>
              <td>{{ tracker.ps_update_stream }}</td>
              <td>{{ tracker.status?.toUpperCase() || 'EMPTY' }}</td>
              <td>{{ tracker.resolution?.toUpperCase() }}</td>
              <td>{{ formatDate(tracker.created_dt ?? '', true) }}</td>
              <td>{{ formatDate(tracker.updated_dt ?? '', true) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="sortedTrackers.length === 0">
          No trackers to display
        </div>
      </div>
    </div>
    <TrackerManager
      v-if="showTrackerManager"
      mode="embedded"
      :flawId="flawId"
      :affects="affectsNotBeingDeleted"
      @affects-trackers:refresh="emit('affects:refresh')"
    />
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
      background-color: $light-teal;
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
        pointer-events: none;
      }

      .badge {
        height: 28px;
        border-radius: 0.25rem;
        background-color: $light-teal;
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

      tr th {
        user-select: none;

        #status-filter .bi {
          font-size: 1rem;
        }

        &:nth-of-type(1) {
          width: 12.5%;
        }

        &:nth-of-type(2) {
          width: 18.5%;
        }

        &:nth-of-type(3) {
          width: 18.5%;
        }

        &:nth-of-type(4) {
          width: 12.5%;
        }

        &:nth-of-type(5) {
          width: 12.5%;
        }

        &:nth-of-type(6) {
          width: 12.5%;
          cursor: pointer;
        }

        &:nth-of-type(7) {
          width: 12.5%;
          cursor: pointer;
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
