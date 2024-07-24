<script setup lang="ts">
import { computed, ref } from 'vue';
import { formatDate } from '@/utils/helpers';
import type { ZodTrackerType } from '@/types/zodAffect';

const props = defineProps<{
  displayedTrackers: ZodTrackerType[];
  allTrackersCount: number;
}>();

// TODO File Tracker
// const emit = defineEmits<{
//   'file-tracker': [value: object];
// }>();

const shouldShowTrackers = ref(false);

const hasTrackers = computed(() => props.allTrackersCount > 0);

// Trackers Pagination
const currentPage = ref(1);
const itemsPerPage = ref(10);

const paginatedTrackers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return props.displayedTrackers.slice(start, end);
});

const totalPages = computed(() =>
  Math.ceil(props.displayedTrackers.length / itemsPerPage.value)
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

          <div class="affects-info-badges my-auto d-flex gap-1" :class="{ 'mx-3': hasTrackers }">
            <span
              v-if="hasTrackers"
              class="badge border bg-light-teal text-black"
              title="All trackers in this flaw"
            >
              All trackers {{ allTrackersCount }}
            </span>
            <span
              v-if="paginatedTrackers.length > 0"
              class="badge bg-light-teal text-black"
              title="Trackers displayed in current page"
            >
              Displaying {{ paginatedTrackers.length }}
            </span>
          </div>
          <!-- TODO View/Hide Available Trackers Button -->
          <button
            v-show="!shouldShowTrackers"
            type="button"
            class="btn btn-sm btn-info ms-auto"
            @click="shouldShowTrackers = !shouldShowTrackers"
          >
            <i class="bi bi-binoculars"></i>
            Manage Trackers
          </button>
        </div>
      </div>
      <div
        class="osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark"
      >
        <div v-if="displayedTrackers.length === 0">
          No trackers to display
        </div>
        <table v-else class="table table-striped table-info mb-0">
          <thead class="sticky-top" style="z-index: 1;">
            <tr>
              <th>Module</th>
              <th>Type</th>
              <th>Product Stream</th>
              <th>Status</th>
              <th>Created date</th>
              <th>Updated date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(tracker, trackerIndex) in paginatedTrackers"
              :key="trackerIndex"
            >
              <td>{{ tracker.ps_update_stream }}</td>
              <td>
                <RouterLink :to="{ path: `/tracker/${tracker.uuid}` }">
                  {{ `${tracker.type} ` }}<i class="bi-box-arrow-up-right" />
                </RouterLink>
              </td>
              <td>
                {{ tracker.ps_update_stream }}
              </td>
              <td>
                {{ tracker.status }}
              </td>
              <td>{{ formatDate(tracker.created_dt ?? '', true) }}</td>
              <td>{{ formatDate(tracker.updated_dt ?? '', true) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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

    .affects-table-actions {
      button {
        margin-inline: .1rem;
      }
    }
  }

  table {
    td {
        padding: .25rem;
        padding-left: .5rem;
      }

    tr td,
    tr th {
      &:nth-of-type(1) {
        width: 10%;
      }
      &:nth-of-type(2) {
        width: 10%;
      }
      &:nth-of-type(3) {
        width: 20%;
      }
      &:nth-of-type(4) {
        width: 20%;
      }
      &:nth-of-type(5) {
        width: 10%;
      }
      &:nth-of-type(6) {
        width: 15%;
      }
      &:nth-of-type(7) {
        width: 15%;
      }
    }
  }
}

</style>
