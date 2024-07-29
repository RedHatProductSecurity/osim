<script setup lang="ts">
import { computed, toRefs, ref, type Ref } from 'vue';
import {
  affectImpacts,
  affectAffectedness,
  affectResolutions,
  AffectednessResolutionPairs,
} from '@/types/zodAffect';
import { type ZodAffectType } from '@/types/zodAffect';
import { uniques } from '@/utils/helpers';
import { equals, clone, prop, descend, ascend, sortWith } from 'ramda';
import FlawTrackers from '@/components/FlawTrackers.vue';
import TrackersManager from '@/components/TrackersManager.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import Modal from '@/components/widgets/Modal.vue';
import { useModal } from '@/composables/useModal';

const { isModalOpen, openModal, closeModal } = useModal();

const props = defineProps<{
  flawId: string;
  embargoed: boolean;
  affects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: Record<string, any>[] | null;
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'affect:remove': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'affect:add': [value: ZodAffectType];
  'affects:refresh': [];
}>();

const { affects, affectsToDelete } = toRefs(props);

const savedAffects = clone(affects.value) as ZodAffectType[];

const allAffects = computed(() => affectsToDelete.value.concat(affects.value));

const affectsNotBeingDeleted = computed(
  () => affects.value.filter((affect) => !affectsToDelete.value.includes(affect))
);

// Sorting
type sortKeys = keyof Pick<ZodAffectType,
  'ps_module' | 'ps_component' | 'trackers' | 'affectedness' | 'resolution' | 'impact' | 'cvss_scores'
>;
const sortKey = ref<sortKeys>('ps_module');
const sortOrder = ref(ascend);

const setSort = (key: sortKeys) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === ascend ? descend : ascend;
  } else {
    sortKey.value = key;
    sortOrder.value = ascend;
  }
};

function sortAffects(affects: ZodAffectType[], standard: boolean): ZodAffectType[] {
  const customSortKey = sortKey.value;
  const order = sortOrder.value;

  const customSortFn = (affect: ZodAffectType) => {
    if (customSortKey === 'trackers') {
      return affect.trackers.length;
    }
    else if (customSortKey === 'cvss_scores') {
      return affect[customSortKey].length;
    }
    return affect[customSortKey] || 0;
  };

  const comparator = standard
    ? [ascend<ZodAffectType>(prop('ps_module'))]
    : [order<ZodAffectType>(customSortFn)];

  return sortWith([
    ascend((affect: ZodAffectType) => !affect.uuid ? 0 : 1),
    ascend((affect: ZodAffectType) => isBeingEdited(affect) ? 0 : 1),
    ...comparator
  ])(affects);
}

enum displayModes {
  ALL = 'All',
  SELECTED = 'Selected',
  EDITING = 'Editing',
  MODIFIED = 'Modified',
  DELETED = 'Deleted',
  CREATED = 'Created',
}

const displayMode = ref(displayModes.ALL);

const displayedAffects = computed(() => {
  switch (displayMode.value) {
  case displayModes.SELECTED:
    return selectedAffects.value;
  case displayModes.EDITING:
    return affectsBeingEdited.value;
  case displayModes.MODIFIED:
    return modifiedAffects.value;
  case displayModes.DELETED:
    return affectsToDelete.value;
  case displayModes.CREATED:
    return newAffects.value;
  default:
    return allAffects.value;
  }
});

function toggleDisplayMode(mode: displayModes) {
  if (displayMode.value === mode) {
    displayMode.value = displayModes.ALL;
  } else {
    displayMode.value = mode;
  }
  currentPage.value = 1;
}

const filteredAffects = computed(() => {
  if (displayedAffects.value.length <= 0) {
    toggleDisplayMode(displayModes.ALL);
  }
  return displayedAffects.value.filter(affect => {
    const matchesSelectedModules =
      selectedModules.value.length === 0 || selectedModules.value.includes(affect.ps_module);
    const matchesAffectednessFilter =
      affectednessFilter.value.length === 0 || affectednessFilter.value.includes(affect.affectedness ?? '');
    const matchesResolutionFilter =
      resolutionsFilter.value.length === 0 || resolutionsFilter.value.includes(affect.resolution ?? '');
    const matchesImpactsFilter =
      impactsFilter.value.length === 0 || impactsFilter.value.includes(affect.impact ?? '');
    return matchesSelectedModules && matchesAffectednessFilter && matchesResolutionFilter && matchesImpactsFilter;
  });
});

const sortedAffects = computed(() =>
  sortAffects(filteredAffects.value, false)
);

const hasAffects = computed(() => allAffects.value.length > 0);

// Affected Modules Filter
const modulesExpanded = ref(true);

function toggleModulesCollapse() {
  modulesExpanded.value = !modulesExpanded.value;
}

const affectedModules = computed(() =>
  uniques(sortAffects(allAffects.value, true).map((affect) => affect.ps_module)));
const selectedModules = ref<string[]>([]);

function moduleTrackersCount(moduleName: string) {
  return affects.value
    .filter(affect => affect.ps_module === moduleName)
    .reduce((count, affect) => count + affect.trackers.length, 0);
}

function isModuleSelected(moduleName: string) {
  return selectedModules.value.includes(moduleName);
}

function handleModuleSelection(moduleName: string) {
  if (isModuleSelected(moduleName)) {
    selectedModules.value.splice(selectedModules.value.indexOf(moduleName), 1);
  } else {
    selectedModules.value.push(moduleName);
  }
  currentPage.value = 1;
}

// Affect Field Specific Filters
const affectednessFilter = ref<string[]>([]);
const resolutionsFilter = ref<string[]>([]);
const impactsFilter = ref<string[]>([]);

function toggleFilter(filterArray: Ref<string[]>, item: string) {
  const index = filterArray.value.indexOf(item);
  if (index > -1) {
    filterArray.value.splice(index, 1);
  } else {
    filterArray.value.push(item);
  }
}

function toggleAffectednessFilter(affectedness: string) {
  toggleFilter(affectednessFilter, affectedness);
}

function toggleResolutionsFilter(resolution: string) {
  toggleFilter(resolutionsFilter, resolution);
}

function toggleImpactsFilter(impact: string) {
  toggleFilter(impactsFilter, impact);
}

// Edit Affects
const affectsBeingEdited = ref<ZodAffectType[]>([]);
const affectValuesPriorEdit = ref<ZodAffectType[]>([]);

function isBeingEdited(affect: ZodAffectType) {
  return affectsBeingEdited.value.includes(affect);
}

function getAffectPriorEdit(affect: ZodAffectType): ZodAffectType {
  return affectValuesPriorEdit.value.find(a => a.uuid === affect.uuid) || affect;
}

function editAffect(affect: ZodAffectType) {
  if (isAffectSelected(affect)) {
    toggleAffectSelection(affect);
  }
  if (!isBeingEdited(affect)) {
    affectsBeingEdited.value.push(affect);
    const affectCopy = clone(affect) as ZodAffectType;
    affectValuesPriorEdit.value.push(affectCopy);
  }
}

function editSelectedAffects() {
  selectedAffects.value.forEach(affect => {
    editAffect(affect);
  });
}

function commitChanges(affect: ZodAffectType) {
  affectsBeingEdited.value.splice(affectsBeingEdited.value.indexOf(affect), 1);
  affectValuesPriorEdit.value.splice(affectValuesPriorEdit.value.indexOf(affect), 1);
  if (isAffectSelected(affect)) {
    toggleAffectSelection(affect);
  }
}

function cancelChanges(affect: ZodAffectType) {
  const priorAffect = getAffectPriorEdit(affect);
  const index = affects.value.findIndex(a => a.uuid === affect.uuid);
  if (index !== -1 && priorAffect) {
    affects.value[index] = { ...priorAffect };
  }
  affectsBeingEdited.value.splice(affectsBeingEdited.value.indexOf(affect), 1);
  affectValuesPriorEdit.value.splice(affectValuesPriorEdit.value.indexOf(affect), 1);
  if (isAffectSelected(affect)) {
    toggleAffectSelection(affect);
  }
}

function commitAllChanges() {
  const affectsToCommit = [...affectsBeingEdited.value];
  affectsToCommit.forEach(affect => {
    commitChanges(affect);
  });
}

function cancelAllChanges() {
  const affectsToCancel = [...affectsBeingEdited.value];
  affectsToCancel.forEach(affect => {
    cancelChanges(affect);
  });
}

const handleEdit = (event: KeyboardEvent, affect: ZodAffectType) => {
  if (event.key === 'Escape') {
    cancelChanges(affect);
  } else if (event.key === 'Enter') {
    commitChanges(affect);
  }
};

// Modified affects
const modifiedAffects = computed(() =>
  affects.value.filter(affect => {
    const savedAffect = savedAffects.find(a => a.uuid === affect.uuid);
    return savedAffect
      && !equals(savedAffect, affect)
      && !affectsBeingEdited.value.includes(affect)
      && !newAffects.value.includes(affect);
  })
);

function isModified(affect: ZodAffectType) {
  return modifiedAffects.value.includes(affect);
}

function restoreSavedAffect(affect: ZodAffectType) {
  const saved = savedAffects.find(a => a.uuid === affect.uuid);
  const index = affects.value.findIndex(a => a.uuid === affect.uuid);
  if (index !== -1 && saved) {
    affects.value[index] = { ...saved };
  }
  if (isAffectSelected(affect)) {
    toggleAffectSelection(affect);
  }
}

function restoreAllSavedAffects() {
  const affectsToRestore = [...modifiedAffects.value];
  affectsToRestore.forEach(affect => {
    if (!affectsBeingEdited.value.includes(affect)) {
      restoreSavedAffect(affect);
    }
  });
}

// Create affects
const newAffects = computed(() => affects.value.filter(affect => !affect.uuid));

function isNewAffect(affect: ZodAffectType) {
  return newAffects.value.includes(affect);
}

function addNewAffect() {
  const affect = {
    embargoed: props.embargoed,
    affectedness: 'NEW',
    resolution: '',
    delegated_resolution: '', // should this be null
    ps_module: `NewModule-${newAffects.value.length}`,
    ps_component: `NewComponent-${newAffects.value.length}`,
    impact: '',
    cvss_scores: [{
      // affect: z.string().uuid(),
      cvss_version: 'V3',
      issuer: 'RH',
      comment: '',
      score: null,
      vector: '',
      alerts: [],
    }],
    trackers: [{ errata: [] }],
    alerts: [],
  } as ZodAffectType;
  emit('affect:add', affect);
  affectsBeingEdited.value.push(affect);
}

// Remove affects
function removeAffect(affect: ZodAffectType) {
  if (isAffectSelected(affect)) {
    toggleAffectSelection(affect);
  }
  if (newAffects.value.includes(affect)) {
    affects.value.splice(affects.value.indexOf(affect), 1);
  } else {
    emit('affect:remove', affect);
  }
}

function isRemoved(affect: ZodAffectType) {
  return affectsToDelete.value.includes(affect);
}

function removeSelectedAffects() {
  selectedAffects.value.forEach(affect => {
    removeAffect(affect);
  });
}

function recoverAffect(affect: ZodAffectType) {
  emit('affect:recover', affect);
}

function recoverAllAffects() {
  const affectsToRecover = [...affectsToDelete.value];
  affectsToRecover.forEach(affect => {
    recoverAffect(affect);
  });
}

// Select Affects
const selectedAffects = ref<ZodAffectType[]>([]);

const areAllAffectsSelected = computed(() => {
  return isAllSelectable() && paginatedAffects.value.filter(affect => isSelectable(affect)).every(affect =>
    isAffectSelected(affect));
});

function isSelectable(affect: ZodAffectType) {
  return !isBeingEdited(affect) && !isRemoved(affect);
}

function isAllSelectable() {
  return paginatedAffects.value.filter(affect => isSelectable(affect)).length > 0;
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

function selectAllAffects() {
  if (areAllAffectsSelected.value) {
    paginatedAffects.value.forEach(affect => toggleAffectSelection(affect));
  } else {
    paginatedAffects.value.filter(affect => !isAffectSelected(affect)).forEach(affect => toggleAffectSelection(affect));
  }
}

// Affects Fields
function affectCvss3Vector(affect: ZodAffectType) {
  affect.cvss_scores.find(({ issuer, cvss_version }) => issuer === 'RH' && cvss_version === 'V3')
    ?.vector
    || null;
}

function resolutionOptions(affect: ZodAffectType) {
  return (affect?.affectedness && AffectednessResolutionPairs[affect?.affectedness]) || [];
}

function affectRowTooltip(affect: ZodAffectType) {
  if (isRemoved(affect)) {
    return 'This affect will be deleted on save changes';
  } else if (isNewAffect(affect)) {
    return 'This affect will be created on save changes';
  } else if (isModified(affect)) {
    return 'This affect will be updated on save changes';
  } else {
    '';
  }
}

// Affects Pagination
const minItemsPerPage = 5;
const maxItemsPerPage = 20;
const currentPage = ref(1);
const itemsPerPage = ref(10);

const paginatedAffects = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return sortedAffects.value.slice(start, end);
});

const totalPages = computed(() =>
  Math.ceil(sortedAffects.value.length / itemsPerPage.value)
);

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function reduceItemsPerPage() {
  if (itemsPerPage.value > minItemsPerPage) {
    itemsPerPage.value --;
  }
}

function increaseItemsPerPage() {
  if (itemsPerPage.value < maxItemsPerPage) {
    itemsPerPage.value ++;
  }
}

// Trackers
const allTrackers = computed(() => allAffects.value.flatMap(affect => affect.trackers));
const affectsManaging = ref<ZodAffectType[]>();

const displayedTrackers = computed(() => {
  return sortedAffects.value.flatMap(affect => affect.trackers);
});

function fileTrackersForAffect(affect: ZodAffectType) {
  affectsManaging.value = [affect];
  openModal();
}
</script>

<template>
  <div v-if="affects" class="osim-affects-section my-2">
    <h4>Affected Offerings</h4>
    <div class="affect-modules-selection" :class="{'mb-4': affectedModules.length > 0 && modulesExpanded}">
      <LabelCollapsible
        :isExpanded="modulesExpanded"
        :isExpandable="hasAffects"
        @setExpanded="toggleModulesCollapse"
      >
        <template #label>
          <label class="m-2 form-label">
            Affected Modules
          </label>
        </template>
        <template #buttons>
          <button
            v-if="selectedModules.length > 0"
            type="button"
            class="btn btn-primary btn-sm py-0"
            style="height: 1.5rem;"
            @click="selectedModules = []"
          >
            Clear
          </button>
        </template>
        <template v-for="(moduleName) in affectedModules" :key="moduleName">
          <button
            v-if="moduleName"
            type="button"
            class="module-btn btn btn-sm"
            :class="{
              'btn-secondary': isModuleSelected(moduleName),
              'border-gray': !isModuleSelected(moduleName),
              'fw-bold': moduleTrackersCount(moduleName) === 0,
            }"
            :title="moduleTrackersCount(moduleName) === 0 ? 'This module has no trackers associated' : ''"
            tabindex="-1"
            @click="handleModuleSelection(moduleName)"
          >
            <i
              v-if="moduleTrackersCount(moduleName) === 0"
              class="bi bi-asterisk me-1"
            />
            <span>{{ moduleName }}</span>
          </button>
        </template>
      </LabelCollapsible>
      <span v-if="affectedModules.length === 0" class="my-2 p-2">No affected modules to display</span>
    </div>
    <div class="affects-management">
      <div v-if="hasAffects" class="pagination-controls d-flex gap-1 my-2">
        <button
          type="button"
          tabindex="-1"
          class="btn btn-sm btn-secondary rounded-end-0"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <i class="bi bi-arrow-left fs-5" />
        </button>
        <button
          v-for="page in totalPages"
          :key="page"
          tabindex="-1"
          class="page-btn btn btn-sm rounded-0 btn-secondary"
          :disabled="page === currentPage"
          @click.prevent="changePage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          tabindex="-1"
          class="btn btn-sm btn-secondary rounded-start-0"
          :disabled="currentPage === totalPages || totalPages === 0"
          @click.prevent="changePage(currentPage + 1)"
        >
          <i class="bi bi-arrow-right fs-5" />
        </button>
      </div>
      <div class="affects-toolbar d-flex">
        <div class="affects-info-badges my-auto d-flex gap-1" :class="{ 'me-3': hasAffects }">
          <div
            v-if="paginatedAffects.length > 0"
            class="btn btn-sm btn-secondary"
            style="pointer-events: none;"
          >
            <i
              :style="itemsPerPage > minItemsPerPage ? 'pointer-events: auto;' : 'opacity: 50%; pointer-events: none;'"
              class="bi bi-dash-square"
              title="Reduce affects per page"
              @click="reduceItemsPerPage()"
            />
            <span class="mx-2">{{ `Per page: ${itemsPerPage}` }}</span>
            <i
              :style="itemsPerPage < maxItemsPerPage ? 'pointer-events: auto;' : 'opacity: 50%; pointer-events: none;'"
              class="bi bi-plus-square"
              title="Increase affects per page"
              style="pointer-events: auto;"
              @click="increaseItemsPerPage()"
            />
          </div>
          <span
            v-if="hasAffects"
            class="btn btn-sm border-secondary bg-light-gray text-black"
            :class="{ 'bg-secondary text-white': displayMode === displayModes.ALL }"
            :style="displayMode !== displayModes.ALL ? 'cursor: pointer' : 'cursor: auto'"
            :title="displayMode !== displayModes.ALL ? 'Display all affects' : 'Displaying all affects'"
            @click.stop="toggleDisplayMode(displayModes.ALL)"
          >
            All affects {{ allAffects.length }}
          </span>
          <div
            v-if="selectedAffects.length > 0"
            class="btn btn-sm border-secondary bg-light-gray text-black"
            :class="{ 'bg-secondary text-white': displayMode === displayModes.SELECTED }"
            :title="displayMode !== displayModes.SELECTED ? 'Display selected affects' : 'Displaying selected affects'"
            @click.stop="toggleDisplayMode(displayModes.SELECTED)"
          >
            <i class="bi bi-check-square me-1 h-fit" />
            <span>Selected {{ selectedAffects.length }}</span>
          </div>
          <div
            v-if="affectsBeingEdited.length > 0"
            class="btn btn-sm bg-light-yellow"
            style="border-color: #73480b !important; color: #73480b;"
            :style="displayMode === displayModes.EDITING
              ? 'background-color: #73480b !important; color: #fff4cc;' : ''"
            :title="displayMode === displayModes.EDITING ? 'Displaying editing affects' :'Display editing affects'"
            @click.stop="toggleDisplayMode(displayModes.EDITING)"
          >
            <i class="bi bi-pencil me-1 h-fit" />
            <span>Editing {{ affectsBeingEdited.length }}</span>
          </div>
          <div
            v-if="modifiedAffects.length > 0"
            class="btn btn-sm bg-light-green"
            style="color: #204d00; border-color: #204d00 !important;"
            :style="displayMode === displayModes.MODIFIED
              ? 'background-color: #204d00 !important; color: #d1f1bb;' : ''"
            :title="displayMode === displayModes.MODIFIED ? 'Displaying modified affects' : 'Display modified affects'"
            @click.stop="toggleDisplayMode(displayModes.MODIFIED)"
          >
            <i class="bi bi-file-earmark-diff me-1 h-fit" />
            <span>Modified {{ modifiedAffects.length }}</span>
          </div>
          <div
            v-if="affectsToDelete.length > 0"
            class="btn btn-sm"
            style="background-color: #ffe3d9; color: #731f00; border-color: #731f00 !important;"
            :style="displayMode === displayModes.DELETED
              ? 'background-color: #731f00 !important; color: #ffe3d9;' : ''"
            :title="displayMode === displayModes.DELETED ? 'Displaying removed affects' : 'Display removed affects'"
            @click.stop="toggleDisplayMode(displayModes.DELETED)"
          >
            <i class="bi bi-trash me-1 h-fit" />
            <span>Removed {{ affectsToDelete.length }}</span>
          </div>
          <div
            v-if="newAffects.length > 0"
            class="btn btn-sm bg-light-teal"
            style="background-color: #e0f0ff; color: #036; border-color: #036 !important;"
            :style="displayMode === displayModes.CREATED
              ? 'background-color: #036 !important; color: #e0f0ff;' : ''"
            :title="displayMode === displayModes.CREATED ? 'Displaying new affects' : 'Display new affects'"
            @click.stop="toggleDisplayMode(displayModes.CREATED)"
          >
            <i class="bi bi-plus-lg me-1 h-fit" />
            <span>Added {{ newAffects.length }}</span>
          </div>
        </div>
        <div class="affects-table-actions ms-auto">
          <button
            v-if="affectsBeingEdited.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Commit changes on all affects being edited"
            @click.prevent="commitAllChanges()"
          >
            <i class="bi bi-check" />
          </button>
          <button
            v-if="affectsBeingEdited.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Cancel changes on all affects being edited"
            @click.prevent="cancelAllChanges()"
          >
            <i class="bi bi-x" />
          </button>
          <button
            v-if="modifiedAffects.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Discard all affect modifications"
            @click.prevent="restoreAllSavedAffects()"
          >
            <i class="bi bi-backspace" />
          </button>
          <button
            v-if="affectsToDelete.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Recover all removed affects"
            @click.prevent="recoverAllAffects()"
          >
            <i class="bi-arrow-counterclockwise" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Edit all selected affects"
            @click.prevent="editSelectedAffects()"
          >
            <i class="bi bi-pencil" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Remove all selected affects"
            @click.prevent="removeSelectedAffects()"
          >
            <i class="bi bi-trash" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="btn btn-sm text-white"
            title="Deselect all selected affects"
            @click.prevent="selectedAffects = [];"
          >
            <div class="d-flex">
              <i class="bi bi-x-square me-2" />
              <span>Deselect</span>
            </div>
          </button>
          <button type="button" class="btn btn-sm btn-secondary" @click.prevent="addNewAffect()">
            <i class="bi bi-plus-lg me-2" />
            <span>New Affect</span>
          </button>
        </div>
      </div>
      <table class="table align-middle table-striped mt-1" :class="{'mb-0': totalPages === 0}">
        <thead class="sticky-top table-dark">
          <tr>
            <th>
              <input
                type="checkbox"
                class="form-check-input"
                aria-label="Select All affects in Table"
                title="Toggle selection for all affects in this page not removed or being edited"
                :disabled="!isAllSelectable()"
                :checked="areAllAffectsSelected"
                @change="selectAllAffects()"
              />
            </th>
            <th>
              <!-- State -->
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
            <th @click="setSort('affectedness')">
              <span>Affectedness</span>
              <i
                id="affectedness-filter"
                class="bi mx-1"
                :class="affectednessFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
                :title="affectednessFilter.length !== 0 ? 'There are affectedness filters selected' : ''"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                @click.stop
              />
              <ul class="dropdown-menu" aria-labelledby="affectedness-filter" style="z-index: 10;">
                <template v-for="affectedness in affectAffectedness" :key="affectedness">
                  <button
                    type="button"
                    class="btn dropdown-item"
                    @click.stop="toggleAffectednessFilter(affectedness)"
                  >
                    <i
                      class="bi me-2"
                      :class="affectednessFilter.includes(affectedness) ? 'bi-record-circle' : 'bi-circle'"
                    />
                    <span>{{ affectedness === '' ? 'EMPTY' : affectedness }}</span>
                  </button>
                </template>
              </ul>
              <i
                :class="{
                  'opacity-0': sortKey !== 'affectedness',
                  'bi-caret-down-fill': sortOrder === descend,
                  'bi-caret-up-fill': sortOrder !== descend,
                }"
                class="bi"
              />
            </th>
            <th @click="setSort('resolution')">
              <span>Resolution</span>
              <i
                id="resolution-filter"
                class="bi mx-1"
                :class="resolutionsFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
                :title="resolutionsFilter.length !== 0 ? 'There are resolution filters selected' : ''"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                @click.stop
              />
              <ul class="dropdown-menu" aria-labelledby="resolution-filter" style="z-index: 10;">
                <template v-for="resolution in affectResolutions" :key="resolution">
                  <button
                    type="button"
                    class="btn dropdown-item"
                    @click.stop="toggleResolutionsFilter(resolution)"
                  >
                    <i
                      class="bi me-2"
                      :class="resolutionsFilter.includes(resolution) ? 'bi-record-circle' : 'bi-circle'"
                    />
                    <span>{{ resolution === '' ? 'EMPTY' : resolution }}</span>
                  </button>
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
              <span>Impact</span>
              <i
                id="impact-filter"
                class="bi mx-1"
                :class="impactsFilter.length === 0 ? 'bi-funnel' : 'bi-funnel-fill'"
                :title="impactsFilter.length !== 0 ? 'There are impact filters selected' : ''"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                @click.stop
              />
              <ul class="dropdown-menu" aria-labelledby="impact-filter" style="z-index: 10;">
                <template v-for="impact in affectImpacts" :key="impact">
                  <button
                    type="button"
                    class="btn dropdown-item"
                    @click.stop="toggleImpactsFilter(impact)"
                  >
                    <i class="bi me-2" :class="impactsFilter.includes(impact) ? 'bi-record-circle' : 'bi-circle'" />
                    <span>{{ impact === '' ? 'EMPTY' : impact }}</span>
                  </button>
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
        <tbody>
          <template v-for="(affect, affectIndex) in paginatedAffects" :key="affectIndex">
            <tr
              :class="{
                'border-bottom border-gray': affectIndex === paginatedAffects.length - 1,
                'editing': isBeingEdited(affect),
                'modified': isModified(affect) && !isBeingEdited(affect),
                'new': isNewAffect(affect) && !isBeingEdited(affect),
                'removed': isRemoved(affect),
                'selected': isAffectSelected(affect),
              }"
              style="position: relative;"
              :style="isSelectable(affect) ? 'cursor: pointer' : ''"
              :title="affectRowTooltip(affect)"
              @click.prevent="toggleAffectSelection(affect)"
            >
              <td>
                <i class="row-left-indicator bi bi-caret-right-fill fs-4" />
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="isAffectSelected(affect)"
                  :disabled="isBeingEdited(affect) || isRemoved(affect)"
                  @click.stop="toggleAffectSelection(affect)"
                />
              </td>
              <td>
                <div class="ps-3">
                  <i
                    v-if="isBeingEdited(affect)"
                    class="bi bi-pencil"
                    title="This affect is currently being edited"
                  />
                  <i
                    v-else-if="isNewAffect(affect)"
                    class="bi bi-plus-lg"
                    title="This affect is set for creation on save"
                  />
                  <i
                    v-else-if="isModified(affect)"
                    class="bi bi-file-earmark-diff"
                    title="This affect has modifications to save"
                  />
                  <i
                    v-else-if="isRemoved(affect)"
                    class="bi bi-trash"
                    title="This affect is set for deletion on save"
                  />
                  <i v-else class="bi bi-database-check" title="This affect is saved" />
                </div>
              </td>
              <td>
                <input
                  v-if="isBeingEdited(affect)"
                  v-model="affect.ps_component"
                  class="form-control"
                  @keydown="handleEdit($event, affect)"
                />
                <span v-else>
                  {{ affect.ps_component }}
                </span>
              </td>
              <td>
                <input
                  v-if="isBeingEdited(affect)"
                  v-model="affect.ps_module"
                  class="form-control"
                  @keydown="handleEdit($event, affect)"
                />
                <span v-else>
                  {{ affect.ps_module }}
                </span>
              </td>
              <td>
                <select
                  v-if="isBeingEdited(affect)"
                  v-model="affect.affectedness"
                  class="form-select"
                  @keydown="handleEdit($event, affect)"
                >
                  <option
                    v-for="option in affectAffectedness"
                    :key="option"
                    :value="option"
                    :selected="option === affect.affectedness"
                  >
                    {{ option }}
                  </option>
                </select>
                <span v-else>
                  {{ affect.affectedness }}
                </span>
              </td>
              <td>
                <select
                  v-if="isBeingEdited(affect)"
                  v-model="affect.resolution"
                  class="form-select"
                  @keydown="handleEdit($event, affect)"
                >
                  <option
                    v-for="option in resolutionOptions(affect)"
                    :key="option"
                    :value="option"
                    :selected="option === affect.resolution"
                  >
                    {{ option }}
                  </option>
                </select>
                <span v-else>
                  {{ affect.resolution }}
                </span>
              </td>
              <td>
                <select
                  v-if="isBeingEdited(affect)"
                  v-model="affect.impact"
                  class="form-select"
                  @keydown="handleEdit($event, affect)"
                >
                  <option
                    v-for="option in affectImpacts"
                    :key="option"
                    :value="option"
                    :selected="option === affect.impact"
                  >
                    {{ option }}
                  </option>
                </select>
                <span v-else>
                  {{ affect.impact }}
                </span>
              </td>
              <td>{{ affectCvss3Vector(affect) }}</td>
              <td>
                <div class="d-flex">
                  <span class="me-2">{{ affect.trackers.length }}</span>
                  <button
                    type="button"
                    :disabled="isBeingEdited(affect) || isRemoved(affect)"
                    class="btn btn-sm input-group-text px-1 py-0 my-auto"
                    @click.prevent.stop="fileTrackersForAffect(affect)"
                  >
                    <i class="bi bi-plus" />
                  </button>
                </div>
              </td>
              <td class="affect-action-btns">
                <button
                  v-if="!isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm input-group-text"
                  title="Edit affect"
                  tabindex="-1"
                  @click.stop="editAffect(affect)"
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  v-if="isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm input-group-text editing-btn"
                  title="Commit edit"
                  tabindex="-1"
                  @click.stop="commitChanges(affect)"
                >
                  <i class="bi bi-check" />
                </button>
                <button
                  v-if="!isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm input-group-text"
                  title="Remove affect"
                  tabindex="-1"
                  @click.stop="removeAffect(affect)"
                >
                  <i class="bi bi-trash" />
                </button>
                <button
                  v-if="isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm input-group-text editing-btn"
                  title="Cancel edit"
                  tabindex="-1"
                  @click.stop="cancelChanges(affect)"
                >
                  <i class="bi bi-x" />
                </button>
                <button
                  v-if="affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm input-group-text recover-btn"
                  title="Recover affect"
                  tabindex="-1"
                  @click.stop="emit('affect:recover', affect)"
                >
                  <i class="bi-arrow-counterclockwise" />
                </button>
                <button
                  v-if="!isBeingEdited(affect) && isModified(affect)"
                  type="button"
                  class="btn btn-sm input-group-text"
                  title="Discard changes"
                  tabindex="-1"
                  @click.stop="restoreSavedAffect(affect)"
                >
                  <i class="bi bi-backspace" />
                </button>
                <i class="row-right-indicator bi bi-caret-left-fill fs-4" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <span v-if="!hasAffects" class="my-2 p-2 d-flex">
        This flaw has no affects
      </span>
      <span v-else-if="hasAffects && totalPages === 0" class="my-2 p-2 d-flex">
        No affects found for current filters
      </span>
    </div>
    <FlawTrackers
      :flawId="flawId"
      :displayedTrackers="displayedTrackers"
      :affectsNotBeingDeleted="affectsNotBeingDeleted"
      :allTrackersCount="allTrackers.length"
    />
  </div>
  <Modal :show="isModalOpen" style="max-width: 75%;" @close="closeModal">
    <template #header>
      <div class="d-flex w-100">
        <h4 class="m-0">Tracker Manager</h4>
        <button
          type="button"
          class="btn btn-close ms-auto"
          aria-label="Close"
          @click="closeModal"
        />
      </div>
    </template>
    <template #body>
      <TrackersManager
        :flawId="flawId"
        :affects="affectsManaging || []"
        @affects-trackers:refresh="emit('affects:refresh')"
      />
    </template>
    <template #footer>
      <div></div>
    </template>
  </Modal>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

.osim-affects-section {
  .affect-modules-selection {
    button {
      height: 2rem;
      padding-block: 0;
      margin: .15rem;
    }

    .module-btn {
      transition: color 0.15s background-color 0.15s;
      &:not(.btn-secondary):hover {
        background-color: $gray;
        border-color: $secondary !important;
      }
    }
  }

  .affects-toolbar, .pagination-controls {
    button {
      height: 2rem;
      padding-block: 0;

      &.page-btn:disabled {
        background-color: transparent;
        color: black;
      }
    }

    .affects-table-actions {
      .btn {
        background-color: #212529;
        border-color: #212529;
        margin-inline: .1rem;
      }
    }
  }

  .affects-info-badges {
        > :not(:first-child).badge {
        user-select: none;
        transition: filter .25s, background-color .25s, border-color .25s;
        &:hover {
          filter: brightness(0.9);
        }
      }
  }

  .affect-action-btns {
    button {
      display: inline;
      margin: 0.1rem;
      padding: 0.15rem 0.5rem;
    }
  }

  .affects-management {
    table {
      border-collapse: separate;
      thead {
        th {
          user-select: none;
        }

        th:not(:nth-of-type(10), :nth-of-type(2)) {
          cursor: pointer;
        }
      }

      tbody {
        tr {
          transition: filter 0.25s;
          .row-left-indicator, .row-right-indicator {
            position: absolute;
            opacity: 0;
            transition: opacity 0.5s, right 0.5s, left 0.5s;
            top: 0.25ch;
          }
          .row-right-indicator {
            right: -42px;
          }
          .row-left-indicator {
            left: -42px;
          }
          &:hover {
            filter: brightness(0.9);
            td {
              border-color: rgba(112, 112, 112, 0.75);
            }
            .row-left-indicator, .row-right-indicator {
              opacity: 100;
            }
            .row-right-indicator {
              right: -32px;
            }
            .row-left-indicator {
              left: -32px;
            }
          }

          td {
            transition: background-color 0.5s, color 0.5s, border-color 0.25s;
            padding-block: .2rem;
            border-block: 0.2ch solid #e0e0e0;
            background-color: #e0e0e0;
            button {
              transition: background-color 0.5s, color 0.5s;
              border: none;
              background-color: #212529;
              color: white;
            }

            input, select {
              padding: 0.15rem 0.5rem;
            }
          }
        }

        :not(.editing) td {
          user-select: none;
        }

        .editing {
          &:hover {
            td {
              border-color: rgba(115, 71, 10, 0.5) !important;
            }
          }
          td {
            border-color: $light-yellow !important;
            background-color: $light-yellow;
            color: #73480b;
            button {
              background-color: #73480b;
            }
          }
        }

        .modified {
          &:hover {
            td {
              border-color: rgba(32, 77, 0, 0.5) !important;
            }
          }
          td {
            border-color: $light-green !important;
            background-color: $light-green;
            color: #204d00;
            button {
              background-color: #204d00;
            }
          }
        }

        .new {
          &:hover {
            td {
              border-color: rgba(0, 51, 102, 0.5) !important;
            }
          }
          td {
            border-color: #e0f0ff !important;
            background-color: #e0f0ff;
            color: #036;
            button {
              background-color: #036;
            }
          }
        }

        .removed {
          &:hover {
            td {
              border-color: rgba(115, 31, 0, 0.5) !important;
            }
          }
          td {
            border-color: #ffe3d9 !important;
            background-color: #ffe3d9;
            color: #731f00;
            button {
              background-color: #731f00;
            }
          }
        }

        .selected {
          .row-left-indicator, .row-right-indicator {
            opacity: 100;
          }
          .row-right-indicator {
            right: -24px !important;
          }
          .row-left-indicator {
            left: -24px !important;
          }
        }
      }

      tr td,
      tr th {
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
      }
    }
  }

}
</style>
