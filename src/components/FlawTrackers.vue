<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import { formatDate } from '@/utils/helpers';
import type { ZodAffectType, ZodTrackerType } from '@/types/zodAffect';
import { ascend, descend, sortWith } from 'ramda';
import AffectsTrackers from '@/components/AffectsTrackers.vue';

type TrackerWithModule = ZodTrackerType & { ps_module: string };

const props = defineProps<{
  flawId: string;
  displayedTrackers: TrackerWithModule[];
  affectsNotBeingDeleted: ZodAffectType[];
  allTrackersCount: number;
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'affects:refresh': [];
}>();

const shouldShowTrackers = ref(false);

const hasTrackers = computed(() => props.allTrackersCount > 0);

// Sorting
const sortedTrackers = computed(() =>
  sortTrackers(filteredTrackers.value)
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

  return sortWith([
    ...comparator
  ])(trackers);
}

// Trackers filters by field
const filteredTrackers = computed(() => {
  return props.displayedTrackers.filter(tracker => {
    const matchesStatusFilter =
      statusFilter.value.length === 0 || statusFilter.value.includes(tracker.status ?? 'EMPTY');
    return matchesStatusFilter;
  });
});

const trackerStatuses = computed(() => {
  const statuses = props.displayedTrackers.map(item => item.status || 'EMPTY');
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


// Trackers Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

const paginatedTrackers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedTrackers.value.slice(start, end);
});

const totalPages = computed(() =>
  Math.ceil(sortedTrackers.value.length / itemsPerPage.value)
);

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
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
        <div class="trackers-toolbar d-flex p-2 pt-1">
          <div class="pagination-controls d-flex gap-1">
            <button
              type="button"
              class="btn btn-sm btn-info rounded-end-0"
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              <i class="bi bi-arrow-left fs-5" />
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              class="page-btn btn btn-sm rounded-0 btn-info"
              :disabled="page === currentPage"
              @click.prevent="changePage(page)"
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
          <div class="trackers-badges" :class="{ 'mx-3': hasTrackers }">
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
          <!-- TODO View/Hide Available Trackers Button -->
          <button
            v-show="!shouldShowTrackers"
            type="button"
            class="btn btn-sm btn-info ms-auto"
            @click="shouldShowTrackers = !shouldShowTrackers"
          >
            <i class="bi bi-binoculars" />
            Manage All Trackers
          </button>
        </div>
      </div>
      <div
        class="osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark"
      >
        <table class="table table-striped table-info mb-0">
          <thead class="sticky-top" style="z-index: 1;">
            <tr>
              <th>Bug ID</th>
              <th>Module</th>
              <th>Product Stream</th>
              <th>
                Status
                <i
                  id="status-filter"
                  class="bi mx-1"
                  :class="statusFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
                  :title="statusFilter.length !== 0 ? 'There are status filters selected' : ''"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                />
                <ul class="dropdown-menu" aria-labelledby="status-filter" style="z-index: 10;">
                  <template v-for="status in trackerStatuses" :key="status">
                    <button
                      type="button"
                      class="btn dropdown-item"
                      @click.stop="toggleStatusFilter(status)"
                    >
                      <input
                        type="checkbox"
                        class="form-check-input me-2"
                        :checked="statusFilter.includes(status)"
                      />
                      <span>{{ status.toUpperCase() }}</span>
                    </button>
                  </template>
                </ul>
              </th>
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
                <RouterLink :to="{ path: `/tracker/${tracker.uuid}` }">
                  {{ `${tracker.external_system_id} ` }}<i class="bi-box-arrow-up-right" />
                </RouterLink>
              </td>
              <td>{{ tracker.ps_update_stream }}</td>
              <td>{{ tracker.ps_module }}</td>
              <td>{{ tracker.status?.toUpperCase() || 'EMPTY' }}</td>
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
    <AffectsTrackers
      v-show="shouldShowTrackers"
      :flawId="flawId"
      :theAffects="affectsNotBeingDeleted"
      @affects-trackers:refresh="emit('affects:refresh')"
      @affects-trackers:hide="shouldShowTrackers = false"
    />
  </div>
</template>

<style scoped lang=scss>
@import '@/scss/bootstrap-overrides';

.affects-trackers {
  .osim-tracker-card {
    div {
      padding: 0.5rem;
      background-color: $light-teal;
    }
  }

  .trackers-toolbar {
    button {
      height: 2rem;
      padding-block: 0;

      &.page-btn:disabled {
        background-color: transparent;
        color: $info;
      }
    }

    .trackers-badges {
      display: flex;
      margin-block: 0;
      gap: 0.25rem;

      .badge {
        height: 28px;
        border-radius: 0.25rem;
        background-color: $light-teal;
        color: black;
        margin-block: auto;

        span {
          font-size: 12px;
          vertical-align: middle;
          text-align: center;
        }
      }
    }

    .affects-table-actions {
      button {
        margin-inline: .1rem;
      }
    }
  }

  table {
    thead {
      tr th {
        user-select: none;

        &:nth-of-type(1) {
          width: 15%;
        }

        &:nth-of-type(2) {
          width: 20%;
        }

        &:nth-of-type(3) {
          width: 20%;
        }

        &:nth-of-type(4) {
          width: 15%;
        }

        &:nth-of-type(5) {
          width: 15%;
          cursor: pointer;
        }

        &:nth-of-type(6) {
          width: 15%;
          cursor: pointer;
        }
      }
    }

    td {
      padding: .25rem;
      padding-left: .5rem;
    }
  }
}

</style>
