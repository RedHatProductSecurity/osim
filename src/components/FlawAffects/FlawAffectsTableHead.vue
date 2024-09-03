<script setup lang="ts">
import { computed, ref, type Ref } from 'vue';
import { prop, descend, ascend, sortWith } from 'ramda';

import {
  affectImpacts,
  affectAffectedness,
  affectResolutions,
  // possibleAffectResolutions,
  type ZodAffectType,
} from '@/types/zodAffect';

import { type affectSortKeys, displayModes } from './';

import { useSettingsStore } from '@/stores/SettingsStore';
import { usePagination } from '@/composables/usePagination';


const emit = defineEmits<{
//   'affect:recover': [value: ZodAffectType];
'affects:display-mode': [value: string];
}>();

const affects = defineModel<ZodAffectType[]>('affects', { default: [] });
const props = defineProps<{
  affectsToDelete: ZodAffectType[];
  selectedModules: string[];
}>();

const settings = ref(useSettingsStore().settings);

// // Edit Affects
const affectsEdited = ref<ZodAffectType[]>([]);
const affectValuesPriorEdit = ref<ZodAffectType[]>([]);
// Affect Field Specific Filters
const affectednessFilter = ref<string[]>([]);
const resolutionFilter = ref<string[]>([]);
const impactFilter = ref<string[]>([]);

const filteredAffects = computed(() => {
  if (affects.value.length <= 0) {
    emit('affects:display-mode', displayModes.ALL);
  }
  return affects.value.filter(affect => {
    const matchesSelectedModules =
      props.selectedModules.length === 0 || props.selectedModules.includes(affect.ps_module);
    const matchesAffectednessFilter =
      affectednessFilter.value.length === 0 || affectednessFilter.value.includes(affect.affectedness ?? '');
    const matchesResolutionFilter =
      resolutionFilter.value.length === 0 || resolutionFilter.value.includes(affect.resolution ?? '');
    const matchesImpactsFilter =
      impactFilter.value.length === 0 || impactFilter.value.includes(affect.impact ?? '');
    return matchesSelectedModules && matchesAffectednessFilter && matchesResolutionFilter && matchesImpactsFilter;
  });
});

const sortedAffects = computed(() =>
  sortAffects(filteredAffects.value, false)
);

const sortKey = ref<affectSortKeys>('ps_module');
const sortOrder = ref(ascend);
// // Affects Pagination
const totalPages = computed(() =>
  Math.ceil(sortedAffects.value.length / settings.value.affectsPerPage)
);

// // const minItemsPerPage = 5;
// // const maxItemsPerPage = 20;
const {
  // pages,
  currentPage,
  // changePage,
} = usePagination(totalPages, settings.value.affectsPerPage);

const paginatedAffects = computed(() => {
  const start = (currentPage.value - 1) * settings.value.affectsPerPage;
  const end = start + settings.value.affectsPerPage;
  return sortedAffects.value.slice(start, end);
});

function toggleFilter(filterArray: Ref<string[]>, sortValue: string) {
  const index = filterArray.value.indexOf(sortValue);
  if (index > -1) {
    filterArray.value.splice(index, 1);
  } else {
    filterArray.value.push(sortValue);
  }
}

function toggleAffectednessFilter(affectedness: string) {
  toggleFilter(affectednessFilter, affectedness);
}

function toggleResolutionFilter(resolution: string) {
  toggleFilter(resolutionFilter, resolution);
}

function toggleImpactFilter(impact: string) {
  toggleFilter(impactFilter, impact);
}



function isBeingEdited(affect: ZodAffectType) {
  return affectsEdited.value.includes(affect);
}

function getAffectPriorEdit(affect: ZodAffectType): ZodAffectType {
  return affectValuesPriorEdit.value.find(a => a.uuid === affect.uuid) || affect;
}

// Select Affects
const selectedAffects = ref<ZodAffectType[]>([]);

const areAllAffectsSelected = computed(() => {
  return paginatedAffects.value.filter(affect => isSelectable(affect)).every(affect =>
    isAffectSelected(affect));
});

const indeterminateSelection = computed(() => {
  return !areAllAffectsSelected.value && paginatedAffects.value.filter(affect => isSelectable(affect)).some(affect =>
    isAffectSelected(affect));
});

function isSelectable(affect: ZodAffectType) {
  return !isBeingEdited(affect) && !isRemoved(affect);
}

function isAllNotSelectable() {
  return paginatedAffects.value.every(affect => !isSelectable(affect));
}

function isAffectSelected(affect: any) {
  return selectedAffects.value.includes(affect);
}

function toggleAffectSelection(affect: ZodAffectType) {
  if (!isSelectable(affect)) {
    return;
  }
  if (!isAffectSelected(affect)) {
    selectedAffects.value.push(affect);
  } else {
    selectedAffects.value = selectedAffects.value.filter(a => a !== affect);
  }
}

function selectAffects(event: Event) {
  if (areAllAffectsSelected.value) {
    paginatedAffects.value.forEach(affect => toggleAffectSelection(affect));
  } else if (selectedAffects.value.length === 0) {
    paginatedAffects.value.filter(affect => !isAffectSelected(affect)).forEach(affect => toggleAffectSelection(affect));
  } else {
    paginatedAffects.value.filter(affect => isAffectSelected(affect)).forEach(affect => toggleAffectSelection(affect));
    (event.target as HTMLInputElement).checked = false;
  }
}

function setSort(key: affectSortKeys) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === ascend ? descend : ascend;
  } else {
    sortKey.value = key;
    sortOrder.value = ascend;
  }
}

function sortAffects(affects: ZodAffectType[], standard: boolean): ZodAffectType[] {
  const customSortKey = sortKey.value;
  const order = sortOrder.value;

  const customSortFn = (affect: ZodAffectType) => {
    const affectToSort = isBeingEdited(affect) ? getAffectPriorEdit(affect) : affect;
    if (customSortKey === 'trackers') {
      return affectToSort.trackers.length;
    }
    else if (customSortKey === 'cvss_scores') {
      return affectToSort[customSortKey].length;
    }
    return affectToSort[customSortKey] || 0;
  };

  const comparator = standard
    ? [ascend<ZodAffectType>(prop('ps_module')), ascend<ZodAffectType>(prop('ps_component'))]
    : [order<ZodAffectType>(customSortFn),
      order<ZodAffectType>(customSortKey === 'ps_module' ? prop('ps_component') : prop('ps_module'))];

  return sortWith([
    ascend((affect: ZodAffectType) => !affect.uuid ? 0 : 1),
    ...comparator
  ])(affects);
}

function isRemoved(affect: ZodAffectType) {
  return props.affectsToDelete.includes(affect);
}
</script>

<template>
  <thead class="sticky-top table-dark">
    <tr>
      <th>
        <input
          type="checkbox"
          class="form-check-input"
          aria-label="Select All affects in Table"
          :disabled="isAllNotSelectable()"
          :indeterminate="indeterminateSelection"
          :checked="areAllAffectsSelected && !isAllNotSelectable()"
          @change="selectAffects($event)"
        />
      </th>
      <th>
        <!-- State -->
      </th>
      <th @click="setSort('ps_module')">
        Module
        <i
          :class="{
            'opacity-0': sortKey !== 'ps_module',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
      </th>
      <th @click="setSort('ps_component')">
        Component
        <i
          :class="{
            'opacity-0': sortKey !== 'ps_component',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
      </th>
      <th @click="setSort('affectedness')">
        <span class="align-bottom me-1">Affectedness</span>
        <button
          id="affectedness-filter"
          type="button"
          class="btn btn-sm border-0 p-0 me-1"
          data-bs-toggle="dropdown"
          data-bs-auto-close="outside"
          aria-expanded="false"
          @contextmenu.prevent="affectednessFilter = []"
          @click.stop
        >
          <i
            class="bi text-white"
            :class="affectednessFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
            :title="affectednessFilter.length !== 0 ? 'Filtering by some affectedness' : ''"
          />
        </button>
        <ul class="dropdown-menu" aria-labelledby="affectedness-filter" style="z-index: 10;">
          <template v-for="affectedness in affectAffectedness" :key="affectedness">
            <li><a
              href="#"
              class="btn py-0 dropdown-item"
              @click.prevent.stop="toggleAffectednessFilter(affectedness)"
            >
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="affectednessFilter.includes(affectedness)"
                @click.stop="toggleAffectednessFilter(affectedness)"
              />
              <span>{{ affectedness === '' ? 'EMPTY' : affectedness }}</span>
            </a></li>
          </template>
        </ul>
        <i
          :class="{
            'opacity-0': sortKey !== 'affectedness',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi align-middle"
        />
      </th>
      <th @click="setSort('resolution')">
        <span class="align-bottom me-1">Resolution</span>
        <button
          id="resolution-filter"
          type="button"
          class="btn btn-sm border-0 p-0 me-1"
          data-bs-toggle="dropdown"
          data-bs-auto-close="outside"
          aria-expanded="false"
          @contextmenu.prevent="resolutionFilter = []"
          @click.stop
        >
          <i
            class="bi text-white"
            :class="resolutionFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
            :title="resolutionFilter.length !== 0 ? 'Filtering by some resolutions' : ''"
          />
        </button>
        <ul class="dropdown-menu" aria-labelledby="resolution-filter" style="z-index: 10;">
          <template v-for="resolution in affectResolutions" :key="resolution">
            <li><a
              href="#"
              class="btn py-0 dropdown-item"
              @click.prevent.stop="toggleResolutionFilter(resolution)"
            >
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="resolutionFilter.includes(resolution)"
                @click.stop="toggleResolutionFilter(resolution)"
              />
              <span>{{ resolution === '' ? 'EMPTY' : resolution }}</span>
            </a></li>
          </template>
        </ul>
        <i
          :class="{
            'opacity-0': sortKey !== 'resolution',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi align-middle"
        />
      </th>
      <th @click="setSort('impact')">
        <span class="align-bottom me-1">Impact</span>
        <button
          id="impact-filter"
          type="button"
          class="btn btn-sm border-0 p-0 me-1"
          data-bs-toggle="dropdown"
          data-bs-auto-close="outside"
          aria-expanded="false"
          @contextmenu.prevent="impactFilter = []"
          @click.stop
        >
          <i
            class="bi text-white"
            :class="impactFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
            :title="impactFilter.length !== 0 ? 'Filtering by some impacts' : ''"
          />
        </button>
        <ul class="dropdown-menu" aria-labelledby="impact-filter" style="z-index: 10;">
          <template v-for="impact in affectImpacts" :key="impact">
            <li><a
              href="#"
              class="btn py-0 dropdown-item"
              @click.prevent.stop="toggleImpactFilter(impact)"
            >
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="impactFilter.includes(impact)"
                @click.stop="toggleImpactFilter(impact)"
              />
              <span>{{ impact === '' ? 'EMPTY' : impact }}</span>
            </a></li>
          </template>
        </ul>
        <i
          :class="{
            'opacity-0': sortKey !== 'impact',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi align-middle"
        />
      </th>
      <th @click="setSort('cvss_scores')">
        CVSS
        <i
          :class="{
            'opacity-0': sortKey !== 'cvss_scores',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
      </th>
      <th @click="setSort('trackers')">
        Trackers
        <i
          :class="{
            'opacity-0': sortKey !== 'trackers',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
      </th>
      <th>Actions</th>
    </tr>
  </thead>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

thead {
  tr {
    th {
      user-select: none;

      &:nth-of-type(1) {
        width: 2%;
      }

      &:nth-of-type(2) {
        width: 4%;
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
        width: 10%;
      }

      &:nth-of-type(7) {
        width: 8%;
      }

      &:nth-of-type(8) {
        width: 8%;
      }

      &:nth-of-type(9) {
        width: 8%;
      }

      &:nth-of-type(10) {
        width: 8%;
      }

      &:nth-of-type(11) {
        min-width: 0%;
        max-width: 0%;
        width: 0%;
      }

      &:not(:nth-of-type(10), :nth-of-type(2)) {
        cursor: pointer;
      }
    }
  }
}
</style>
