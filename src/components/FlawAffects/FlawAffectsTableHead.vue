<script setup lang="ts">
import { descend } from 'ramda';

import {
  affectImpacts,
  affectAffectedness,
  affectResolutions,
  // possibleAffectResolutions,
  type ZodAffectType,
} from '@/types/zodAffect';

import { useFilterSortAffects } from './useFilterSortAffects';
import { useAffectSelections } from './useAffectSelections';

const props = defineProps<{
  affectsBeingEdited: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  selectedModules: string[];
}>();

const affects = defineModel<ZodAffectType[]>('affects', { default: [] });

const {
  affectednessFilters,
  impactFilters,
  resolutionFilters,
  setAffectednessFilter,
  setImpactFilter,
  setResolutionFilter,
  setSort,
  sortKey,
  sortOrder,
} = useFilterSortAffects();

// Edit Affects

function isBeingEdited(affect: ZodAffectType) {
  return props.affectsBeingEdited.includes(affect);
}

const {
  areAllAffectsSelectable,
  areAllAffectsSelected,
  isIndeterminateSelection,
  toggleMultipleAffectSelections,
} = useAffectSelections(affects, affect => !isRemoved(affect) && !isBeingEdited(affect));

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
          :disabled="!areAllAffectsSelectable"
          :indeterminate="isIndeterminateSelection"
          :checked="areAllAffectsSelected && areAllAffectsSelectable"
          @change="toggleMultipleAffectSelections"
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
          @contextmenu.prevent="affectednessFilters = []"
          @click.stop
        >
          <i
            class="bi text-white"
            :class="affectednessFilters.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
            :title="affectednessFilters.length !== 0 ? 'Filtering by some affectedness' : ''"
          />
        </button>
        <ul class="dropdown-menu" aria-labelledby="affectedness-filter" style="z-index: 10;">
          <template v-for="affectedness in affectAffectedness" :key="affectedness">
            <li><a
              href="#"
              class="btn py-0 dropdown-item"
              @click.prevent.stop="setAffectednessFilter(affectedness)"
            >
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="affectednessFilters.includes(affectedness)"
                @click.stop="setAffectednessFilter(affectedness)"
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
          @contextmenu.prevent="resolutionFilters = []"
          @click.stop
        >
          <i
            class="bi text-white"
            :class="resolutionFilters.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
            :title="resolutionFilters.length !== 0 ? 'Filtering by some resolutions' : ''"
          />
        </button>
        <ul class="dropdown-menu" aria-labelledby="resolution-filter" style="z-index: 10;">
          <template v-for="resolution in affectResolutions" :key="resolution">
            <li><a
              href="#"
              class="btn py-0 dropdown-item"
              @click.prevent.stop="setResolutionFilter(resolution)"
            >
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="resolutionFilters.includes(resolution)"
                @click.stop="setResolutionFilter(resolution)"
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
          @contextmenu.prevent="impactFilters = []"
          @click.stop
        >
          <i
            class="bi text-white"
            :class="impactFilters.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
            :title="impactFilters.length !== 0 ? 'Filtering by some impacts' : ''"
          />
        </button>
        <ul class="dropdown-menu" aria-labelledby="impact-filter" style="z-index: 10;">
          <template v-for="impact in affectImpacts" :key="impact">
            <li><a
              href="#"
              class="btn py-0 dropdown-item"
              @click.prevent.stop="setImpactFilter(impact)"
            >
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="impactFilters.includes(impact)"
                @click.stop="setImpactFilter(impact)"
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

      // Checkbox
      &:nth-of-type(1) {
        max-width: 1ch;
      }

      // Editing State
      &:nth-of-type(2) {
        min-width: 1ch;
        max-width: 1ch;
        padding: 0;
      }

      &:nth-of-type(3) {
        min-width: 10ch;
      }

      &:nth-of-type(4) {
        min-width: 10ch;
      }

      &:nth-of-type(5) {
        min-width: 16ch;
      }

      &:nth-of-type(6) {
        min-width: 12ch;
      }

      &:nth-of-type(7) {
        min-width: 8ch;
      }

      &:nth-of-type(8) {
        min-width: 4ch;
      }

      &:nth-of-type(9) {
        min-width: 8ch;
      }

      &:nth-of-type(10) {
        min-width: 6ch;
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
