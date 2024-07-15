<script setup lang="ts">
import { computed, toRefs, ref } from 'vue';
import {
  affectImpacts,
  affectAffectedness,
  affectResolutions,
} from '@/types/zodAffect';
import { type ZodAffectType } from '@/types/zodAffect';
import { uniques } from '@/utils/helpers';
import { equals, clone, prop, descend, ascend, sortWith } from 'ramda';
import FlawTrackers from '@/components/FlawTrackers.vue';

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
}>();

const { affects, affectsToDelete } = toRefs(props);

const savedAffects = clone(affects.value) as ZodAffectType[];

const allAffects = computed(() => affectsToDelete.value.concat(affects.value));

// Sorting
const sortKey = ref('ps_module');
const sortOrder = ref(ascend);

const setSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === ascend ? descend : ascend;
  } else {
    sortKey.value = key;
    sortOrder.value = ascend;
  }
};

function sortAffects(affects: ZodAffectType[], standard: boolean): ZodAffectType[] {
  const customSortKey = sortKey.value as keyof ZodAffectType;
  const order = sortOrder.value;

  const customSortFn = (affect: ZodAffectType) => {
    if (customSortKey === 'trackers') return affect.trackers.length;
    return affect[customSortKey] ?? '';
  };

  const comparator = standard
    ? [ascend(prop('ps_module')), ascend(prop('ps_component'))]
    : [order(customSortFn)];

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
  return selectedModules.value.length > 0
    ? displayedAffects.value.filter(affect => selectedModules.value.includes(affect.ps_module))
    : displayedAffects.value;
});

const sortedAffects = computed(() =>
  sortAffects(filteredAffects.value, false)
);

const hasAffects = computed(() => allAffects.value.length > 0);

// Affect Modules Filter
const affectedModules = computed(() =>
  uniques(sortAffects(allAffects.value, true).map((affect) => affect.ps_module)));
const selectedModules = ref<string[]>([]);

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

// Modified affects
const modifiedAffects = computed(() =>
  affects.value.filter(affect => {
    const savedAffect = savedAffects.find(a => a.uuid === affect.uuid);
    return savedAffect && !equals(savedAffect, affect) && !affectsBeingEdited.value.includes(affect);
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
    affectedness: '',
    resolution: '',
    delegated_resolution: '', // should this be null
    ps_module: '',
    ps_component: `NewComponent${newAffects.value.length}`,
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

function resolutionOptions(affectedness: string) {
  return {
    AFFECTED: affectResolutions,
    NEW: [''],
    NOTAFFECTED: [''],
  }[affectedness] || [''];
}

const hiddenResolutionOptions = computed(() => {
  const availableOptions = ['EMPTY', 'DELEGATED', 'WONTFIX', 'OOSS'];
  return affectResolutions.filter(option => !availableOptions.includes(option));
});

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

// Trackers
const allTrackers = computed(() => allAffects.value.flatMap(affect => affect.trackers));

const displayedTrackers = computed(() => {
  return sortedAffects.value.flatMap(affect => affect.trackers);
});
</script>

<template>
  <div v-if="affects" class="osim-affects-section my-2">
    <h4>Affected Offerings</h4>
    <div class="affect-modules-selection">
      <template v-for="(moduleName) in affectedModules" :key="moduleName">
        <button
          v-if="moduleName"
          type="button"
          class="module-btn btn btn-sm"
          :class="isModuleSelected(moduleName) ? 'btn-secondary' : 'border-gray'"
          @click="handleModuleSelection(moduleName)"
        >
          {{ moduleName }}
        </button>
      </template>
      <button
        v-if="selectedModules.length > 0"
        type="button"
        class="btn btn-primary btn-sm"
        @click="selectedModules = []"
      >
        Clear
      </button>
    </div>
    <div class="affects-management">
      <div class="affects-toolbar d-flex pt-2 mt-2">
        <div v-if="hasAffects" class="pagination-controls d-flex gap-1">
          <button
            type="button"
            class="btn btn-sm btn-secondary rounded-end-0"
            :disabled="currentPage === 1"
            @click="changePage(currentPage - 1)"
          >
            <i class="bi bi-arrow-left fs-5" />
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            class="page-btn btn btn-sm rounded-0 btn-secondary"
            :disabled="page === currentPage"
            @click.prevent="changePage(page)"
          >
            {{ page }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-secondary rounded-start-0"
            :disabled="currentPage === totalPages || totalPages === 0"
            @click.prevent="changePage(currentPage + 1)"
          >
            <i class="bi bi-arrow-right fs-5" />
          </button>
        </div>
        <div class="affects-info-badges my-auto d-flex gap-1" :class="{ 'mx-3': hasAffects }">
          <span
            v-if="paginatedAffects.length > 0"
            class="badge  border border-black bg-light-gray text-black"
            :title="`Display mode: ${displayMode}`"
          >
            Displaying {{ paginatedAffects.length }}
          </span>
          <span
            v-if="hasAffects"
            class="badge  border border-secondary bg-light-gray text-black"
            :class="{ 'bg-secondary text-white': displayMode === displayModes.ALL }"
            :style="displayMode !== displayModes.ALL ? 'cursor: pointer' : ''"
            title="All affects in this flaw"
            @click.stop="toggleDisplayMode(displayModes.ALL)"
          >
            All affects {{ allAffects.length }}
          </span>
          <span v-if="!hasAffects" class="mb-4">
            This flaw has no affects
          </span>
          <span
            v-if="selectedAffects.length > 0"
            class="badge border border-secondary bg-light-gray text-black"
            :class="{ 'bg-secondary text-white': displayMode === displayModes.SELECTED }"
            style="cursor: pointer;"
            title="There are some affects selected"
            @click.stop="toggleDisplayMode(displayModes.SELECTED)"
          >
            Selected {{ selectedAffects.length }}
          </span>
          <span
            v-if="affectsBeingEdited.length > 0"
            class="badge border border-warning bg-light-yellow text-black"
            :class="{ 'bg-warning': displayMode === displayModes.EDITING }"
            style="cursor: pointer;"
            title="Some affects are being edited"
            @click.stop="toggleDisplayMode(displayModes.EDITING)"
          >
            Editing {{ affectsBeingEdited.length }}
          </span>
          <span
            v-if="modifiedAffects.length > 0"
            class="badge border border-success bg-light-green text-black"
            :class="{ 'bg-success': displayMode === displayModes.MODIFIED }"
            style="cursor: pointer;"
            title="Some affects will be modified on save changes"
            @click.stop="toggleDisplayMode(displayModes.MODIFIED)"
          >
            Modified {{ modifiedAffects.length }}
          </span>
          <span
            v-if="affectsToDelete.length > 0"
            class="badge border border-primary"
            :class="{ 'bg-primary text-white': displayMode === displayModes.DELETED }"
            style="background-color: #ffe3d9; color: black; cursor: pointer;"
            title="Some affects will be removed on save changes"
            @click.stop="toggleDisplayMode(displayModes.DELETED)"
          >
            To delete {{ affectsToDelete.length }}
          </span>
          <span
            v-if="newAffects.length > 0"
            class="badge border border-info bg-light-teal text-black"
            :class="{ 'bg-info': displayMode === displayModes.CREATED }"
            style="cursor: pointer;"
            title="Some affects will be created on save changes"
            @click.stop="toggleDisplayMode(displayModes.CREATED)"
          >
            To create {{ newAffects.length }}
          </span>
        </div>
        <div class="affects-table-actions ms-auto">
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Edit all selected affects"
            @click.prevent="editSelectedAffects()"
          >
            <i class="bi bi-pencil" />
          </button>
          <button
            v-if="affectsBeingEdited.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Commit changes on all affects being edited"
            @click.prevent="commitAllChanges()"
          >
            <i class="bi bi-check" />
          </button>
          <button
            v-if="affectsBeingEdited.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Cancel changes on all affects being edited"
            @click.prevent="cancelAllChanges()"
          >
            <i class="bi bi-x" />
          </button>
          <button
            v-if="modifiedAffects.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Discard all affect modifications"
            @click.prevent="restoreAllSavedAffects()"
          >
            <i class="bi bi-backspace" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Remove all selected affects"
            @click.prevent="removeSelectedAffects()"
          >
            <i class="bi bi-trash" />
          </button>
          <button
            v-if="affectsToDelete.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Recover all removed affects"
            @click.prevent="recoverAllAffects()"
          >
            <i class="bi-arrow-counterclockwise" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="btn btn-secondary btn-sm"
            title="Deselect all selected affects"
            @click.prevent="selectedAffects = [];"
          >
            Deselect
          </button>
          <button type="button" class="btn btn-secondary ms-3" @click.prevent="addNewAffect()">
            Add New Affect
          </button>
        </div>
      </div>
      <span v-if="hasAffects && totalPages === 0" class="my-2 p-2 d-flex">
        No affects found for current filters
      </span>
      <table v-else-if="hasAffects" class="table align-middle table-striped">
        <thead class="sticky-top">
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
              Affectedness
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
              Resolution
              <i
                :class="{
                  'opacity-0': sortKey !== 'resolution',
                  'bi-caret-down-fill': sortOrder === descend,
                  'bi-caret-up-fill': sortOrder !== descend,
                }"
                class="bi"
              />
            </th>
            <th @click="setSort('impact')">
              Impact
              <i
                :class="{
                  'opacity-0': sortKey !== 'impact',
                  'bi-caret-down-fill': sortOrder === descend,
                  'bi-caret-up-fill': sortOrder !== descend,
                }"
                class="bi"
              />
            </th>
            <th @click="setSort('cvss_scores')">
              Cvss
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
        <tbody class="table-group-divider">
          <template v-for="(affect, affectIndex) in paginatedAffects" :key="affectIndex">
            <tr
              :class="{
                'border-bottom border-gray': affectIndex === paginatedAffects.length - 1,
                'editing': isBeingEdited(affect),
                'modified': isModified(affect) && !isBeingEdited(affect),
                'new': isNewAffect(affect) && !isBeingEdited(affect),
                'removed': isRemoved(affect)
              }"
              :style="isSelectable(affect) ? 'cursor: pointer' : ''"
              :title="affectRowTooltip(affect)"
              @click.prevent="toggleAffectSelection(affect)"
            >
              <td>
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="isAffectSelected(affect)"
                  :disabled="isBeingEdited(affect) || isRemoved(affect)"
                  @click.stop="toggleAffectSelection(affect)"
                />
              </td>
              <td>
                <input
                  v-if="isBeingEdited(affect)"
                  v-model="affect.ps_component"
                  class="form-control"
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
                >
                  <option
                    v-for="option in resolutionOptions(affect.affectedness || '')"
                    :key="option"
                    :value="option"
                    :selected="option === affect.resolution"
                    :hidden="hiddenResolutionOptions?.includes(option)"
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
              <td>{{ affect.trackers.length }}</td>
              <td class="affect-action-btns">
                <button
                  v-if="!isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="input-group-text"
                  title="Edit affect"
                  @click.stop="editAffect(affect)"
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  v-if="isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="input-group-text"
                  title="Commit edit"
                  @click.stop="commitChanges(affect)"
                >
                  <i class="bi bi-check" />
                </button>
                <button
                  v-if="!isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="input-group-text"
                  title="Remove affect"
                  @click.stop="removeAffect(affect)"
                >
                  <i class="bi bi-trash" />
                </button>
                <button
                  v-if="isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="input-group-text"
                  title="Cancel edit"
                  @click.stop="cancelChanges(affect)"
                >
                  <i class="bi bi-x" />
                </button>
                <button
                  v-if="affectsToDelete.includes(affect)"
                  type="button"
                  class="input-group-text"
                  title="Recover affect"
                  @click.stop="emit('affect:recover', affect)"
                >
                  <i class="bi-arrow-counterclockwise" />
                </button>
                <button
                  v-if="!isBeingEdited(affect) && isModified(affect)"
                  type="button"
                  class="input-group-text"
                  title="Discard changes"
                  @click.stop="restoreSavedAffect(affect)"
                >
                  <i class="bi bi-backspace" />
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <FlawTrackers
      :displayedTrackers="displayedTrackers"
      :allTrackersCount="allTrackers.length"
    />
  </div>
</template>

<style scoped lang=scss>
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

  .affects-toolbar {
    button {
      height: 2rem;
      padding-block: 0;

      &.page-btn:disabled {
        background-color: transparent;
        color: black;
      }
    }

    .badge {
      user-select: none;
    }

    .affects-table-actions {
      button {
        margin-inline: .1rem;
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
      th {
        user-select: none;
      }

      th:not(:nth-of-type(9)) {
        cursor: pointer;
      }

      td {
        padding: .2rem;
        padding-left: .5rem;

        input, select {
          padding: 0.15rem 0.5rem;
        }
      }

      :not(.editing) td {
        user-select: none;
      }

      .editing td {
        background-color: $light-yellow;
      }

      .modified  td {
        background-color: $light-green;
      }

      .new  td {
        background-color: $light-teal;
      }

      .removed td {
        background-color: #ffe3d9;
        color: #731f00;
      }

      tbody {
        tr {
          &:hover {
            box-shadow: -0.25rem 0 0 0 rgba(238, 0, 0, 0.25);
          }
        }
      }

      tr td,
      tr th {
        &:nth-of-type(1) {
          width: 2%;
        }
        &:nth-of-type(2) {
          width: 20%;
        }
        &:nth-of-type(3) {
          width: 20%;
        }
        &:nth-of-type(4) {
          width: 10%;
        }
        &:nth-of-type(5) {
          width: 8%;
        }
        &:nth-of-type(6) {
          width: 8%;
        }
        &:nth-of-type(7) {
          width: 10%;
        }
        &:nth-of-type(8) {
          width: 10%;
        }
        &:nth-of-type(9) {
          width: 8%;
        }
      }
    }
  }
}
</style>
