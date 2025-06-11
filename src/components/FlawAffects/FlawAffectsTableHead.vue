<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { descend } from 'ramda';

import {
  affectImpacts,
  affectAffectedness,
  affectResolutions,
} from '@/types/zodAffect';
import { useAffectsEditingStore } from '@/stores/AffectsEditingStore';
import { useSettingsStore } from '@/stores/SettingsStore';

import { useFilterSortAffects } from './useFilterSortAffects';

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

const {
  areAllAffectsSelectable,
  areAllAffectsSelected,
  isIndeterminateSelection,
  toggleMultipleAffectSelections,
} = useAffectsEditingStore();

// --- Resizing Logic ---
const { settings } = useSettingsStore();
const resizingColIndex = ref<null | number>(null);
const initialMouseX = ref<number>(0);
const initialColWidth = ref<number>(0);
const nextColInitialWidth = ref<number>(0);

const startResize = (event: MouseEvent, index: number) => {
  resizingColIndex.value = index;
  initialMouseX.value = event.clientX;
  initialColWidth.value = (event.target as HTMLElement).parentElement!.offsetWidth;

  if (index + 1 < settings.affectsColumnWidths.length && settings.affectsColumnWidths[index + 1] !== undefined) {
    nextColInitialWidth.value = settings.affectsColumnWidths[index + 1];
  } else {
    nextColInitialWidth.value = 0;
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', endResize);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const totalColumnWidth = computed(() => {
  return settings.affectsColumnWidths.reduce((sum, width) => sum + width, 0);
});

const onMouseMove = (event: MouseEvent) => {
  if (resizingColIndex.value === null) return;

  const dx = event.clientX - initialMouseX.value;

  let newCurrentColWidth = Math.max(50, Math.min(500, initialColWidth.value + dx));

  const potentialTotalWidth = totalColumnWidth.value - initialColWidth.value + newCurrentColWidth;

  if (potentialTotalWidth >= 1800) {
    newCurrentColWidth = Math.min(500,
      1800 - (totalColumnWidth.value - settings.affectsColumnWidths[resizingColIndex.value]));
  }

  settings.affectsColumnWidths[resizingColIndex.value] = newCurrentColWidth;
  updateColumnWidths();
};

const headerRowRef = ref<HTMLTableRowElement | null>(null);

onMounted(() => {
  updateColumnWidths();
});

const endResize = () => {
  resizingColIndex.value = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', endResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

function updateColumnWidths() {
  if (Object.keys(settings.affectsColumnWidths).length === 0 && headerRowRef.value) {
    const thElements = headerRowRef.value.querySelectorAll('th');

    thElements.forEach((th: HTMLElement, index) => {
      settings.affectsColumnWidths[index] = th.offsetWidth;
    });
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', endResize);
});
</script>

<template>
  <thead class="sticky-top table-dark">
    <tr ref="headerRowRef">
      <th id="select-column-header" :style="{ width: settings.affectsColumnWidths[0] + 'px' }">
        <input
          type="checkbox"
          class="form-check-input"
          aria-label="Select All affects in Table"
          :disabled="!areAllAffectsSelectable"
          :indeterminate="isIndeterminateSelection"
          :checked="areAllAffectsSelected && areAllAffectsSelectable"
          @change="toggleMultipleAffectSelections"
        />
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 0)"
        ></div>
      </th>
      <th id="state-column-header" :style="{ width: settings.affectsColumnWidths[1] + 'px' }">
        <!-- State -->

        <div
          class="resizer-handle"
          @mousedown="startResize($event, 1)"
        ></div>
      </th>
      <th
        id="module-column-header"
        :style="{ width: settings.affectsColumnWidths[2] + 'px' }"
        @click="setSort('ps_module')"
      >
        Module
        <i
          :class="{
            'opacity-0': sortKey !== 'ps_module',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 2)"
        ></div>
      </th>
      <th
        id="component-column-header"
        :style="{ width: settings.affectsColumnWidths[3] + 'px' }"
        @click="setSort('ps_component')"
      >
        Component
        <i
          :class="{
            'opacity-0': sortKey !== 'ps_component',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 3)"
        ></div>
      </th>
      <th
        id="purl-column-header"
        :style="{ width: settings.affectsColumnWidths[4] + 'px' }"
      >
        PURL
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 4)"
        ></div>
      </th>
      <th
        id="affectedness-column-header"
        :style="{ width: settings.affectsColumnWidths[5] + 'px' }"
        @click="setSort('affectedness')"
      >
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
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 5)"
        ></div>
        <i
          :class="{
            'opacity-0': sortKey !== 'affectedness',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi align-middle"
        />
      </th>
      <th
        id="justification-column-header"
        :style="{ width: settings.affectsColumnWidths[6] + 'px' }"
      >
        <span class="align-bottom me-1">Justification</span>
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 6)"
        ></div>
      </th>
      <th
        id="resolution-column-header"
        :style="{ width: settings.affectsColumnWidths[7] + 'px' }"
        @click="setSort('resolution')"
      >
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
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 7)"
        ></div>
      </th>
      <th
        id="impact-column-header"
        :style="{ width: settings.affectsColumnWidths[8] + 'px' }"
        @click="setSort('impact')"
      >
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
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 8)"
        ></div>
      </th>
      <th
        id="cvss-column-header"
        :style="{ width: settings.affectsColumnWidths[9] + 'px' }"
        @click="setSort('cvss_scores')"
      >
        CVSS
        <i
          :class="{
            'opacity-0': sortKey !== 'cvss_scores',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 9)"
        />
      </th>
      <th
        id="trackers-column-header"
        :style="{ width: settings.affectsColumnWidths[10] + 'px' }"
        @click="setSort('trackers')"
      >
        Trackers
        <i
          :class="{
            'opacity-0': sortKey !== 'trackers',
            'bi-caret-down-fill': sortOrder === descend,
            'bi-caret-up-fill': sortOrder !== descend,
          }"
          class="bi"
        />
        <div
          class="resizer-handle"
          @mousedown="startResize($event, 10)"
        />
      </th>
      <th id="actions-column-header" :style="{ width: settings.affectsColumnWidths[11] + 'px' }">Actions</th>
    </tr>
  </thead>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

thead {
  tr {
    th {
      position: relative;
      user-select: none;
      text-wrap: nowrap;

      .resizer-handle {
        position: absolute;
        background-color: #707070;
        right: 0;
        top: 0;
        height: 100%;
        width: 8px;
        border: 1px solid rgb(167, 167, 167);
        cursor: col-resize;
        z-index: 1;
      }

      .resizer-handle:hover {
        background-color: #707070;
      }

      &:not(:nth-of-type(10), :nth-of-type(2)) {
        cursor: pointer;
      }
    }
  }
}
</style>
