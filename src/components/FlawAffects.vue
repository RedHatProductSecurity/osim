<script setup lang="ts">
import { computed, toRefs, ref, type Ref } from 'vue';

import { equals, clone, prop, descend, ascend, sortWith } from 'ramda';

import FlawTrackers from '@/components/FlawTrackers.vue';
import TrackerManager from '@/components/TrackerManager.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import Modal from '@/components/widgets/Modal.vue';

import { useModal } from '@/composables/useModal';
import { usePagination } from '@/composables/usePagination';

import { useSettingsStore } from '@/stores/SettingsStore';
import { uniques } from '@/utils/helpers';
import { type ZodAffectType } from '@/types/zodAffect';
import {
  affectImpacts,
  affectAffectedness,
  affectResolutions,
  possibleAffectResolutions,
} from '@/types/zodAffect';

const props = defineProps<{
  affectCvssToDelete: Record<string, string>;
  affects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  embargoed: boolean;
  error: null | Record<string, any>[];
  flawId: string;
}>();
const emit = defineEmits<{
  'affect:add': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'affect:remove': [value: ZodAffectType];
  'affects:refresh': [];
  'file-tracker': [value: object];
}>();
const settingsStore = useSettingsStore();
const settings = ref(settingsStore.settings);
const { closeModal, isModalOpen, openModal } = useModal();

const { affectCvssToDelete, affects, affectsToDelete } = toRefs(props);
const hasAffects = computed(() => allAffects.value.length > 0);
const allAffects = computed(() => affectsToDelete.value.concat(affects.value));
const savedAffects = clone(affects.value) as ZodAffectType[];

// Sorting
type sortKeys = keyof Pick<ZodAffectType,
  'affectedness' | 'cvss_scores' | 'impact' | 'ps_component' | 'ps_module' | 'resolution' | 'trackers'
>;

const sortedAffects = computed(() =>
  sortAffects(filteredAffects.value, false),
);

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
    const affectToSort = isBeingEdited(affect) ? getAffectPriorEdit(affect) : affect;
    if (customSortKey === 'trackers') {
      return affectToSort.trackers.length;
    } else if (customSortKey === 'cvss_scores') {
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
    ...comparator,
  ])(affects);
}

// Display Modes
enum displayModes {
  ALL = 'All',
  CREATED = 'Created',
  DELETED = 'Deleted',
  EDITING = 'Editing',
  MODIFIED = 'Modified',
  SELECTED = 'Selected',
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
}

const filteredAffects = computed(() => {
  if (displayedAffects.value.length <= 0) {
    toggleDisplayMode(displayModes.ALL);
  }
  return displayedAffects.value.filter((affect) => {
    const matchesSelectedModules =
      selectedModules.value.length === 0 || selectedModules.value.includes(affect.ps_module);
    const matchesAffectednessFilter =
      affectednessFilter.value.length === 0 || affectednessFilter.value.includes(affect.affectedness ?? '');
    const matchesResolutionFilter =
      resolutionFilter.value.length === 0 || resolutionFilter.value.includes(affect.resolution ?? '');
    const matchesImpactsFilter =
      impactFilter.value.length === 0 || impactFilter.value.includes(affect.impact ?? '');
    return matchesSelectedModules && matchesAffectednessFilter && matchesResolutionFilter && matchesImpactsFilter;
  });
});

// Affected Modules Filter
const modulesExpanded = ref(true);

function toggleModulesCollapse() {
  modulesExpanded.value = !modulesExpanded.value;
}

const affectedModules = computed(() =>
  uniques(sortAffects(allAffects.value, true).map(affect => affect.ps_module)));
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
}

// Affect Field Specific Filters
const affectednessFilter = ref<string[]>([]);
const resolutionFilter = ref<string[]>([]);
const impactFilter = ref<string[]>([]);

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

function toggleResolutionFilter(resolution: string) {
  toggleFilter(resolutionFilter, resolution);
}

function toggleImpactFilter(impact: string) {
  toggleFilter(impactFilter, impact);
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
  selectedAffects.value.forEach((affect) => {
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
  affectsToCommit.forEach((affect) => {
    commitChanges(affect);
  });
}

function cancelAllChanges() {
  const affectsToCancel = [...affectsBeingEdited.value];
  affectsToCancel.forEach((affect) => {
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
const omitAffectAttribute = (obj: ZodAffectType, key: keyof ZodAffectType) => {
  const { [key]: _, ...rest } = obj;
  return rest;
};

const modifiedAffects = computed(() =>
  affects.value.filter((affect) => {
    const savedAffect = savedAffects.find(a => a.uuid === affect.uuid);
    return savedAffect
      && !equals(omitAffectAttribute(savedAffect, 'trackers'), omitAffectAttribute(affect, 'trackers'))
      && !affectsBeingEdited.value.includes(affect)
      && !newAffects.value.includes(affect);
  }),
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
  affectsToRestore.forEach((affect) => {
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
    delegated_resolution: '',
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
      embargoed: props.embargoed,
      alerts: [],
    }],
    trackers: [{ errata: [] }],
    alerts: [],
  } as ZodAffectType;
  emit('affect:add', affect);
  // affectsBeingEdited.value.push(affect);
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
  selectedAffects.value.forEach((affect) => {
    removeAffect(affect);
  });
}

function recoverAffect(affect: ZodAffectType) {
  emit('affect:recover', affect);
}

function recoverAllAffects() {
  const affectsToRecover = [...affectsToDelete.value];
  affectsToRecover.forEach((affect) => {
    recoverAffect(affect);
  });
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

// Affects Fields
function affectCvss(affect: ZodAffectType) {
  return affect.cvss_scores.find(({ cvss_version, issuer }) => issuer === 'RH' && cvss_version === 'V3');
}

function affectCvssDisplay(affect: ZodAffectType) {
  const cvssScore = affectCvss(affect)?.score || '';
  const cvssVector = affectCvss(affect)?.vector || '';
  if (cvssScore && cvssVector) {
    return `${cvssScore} ${cvssVector}`;
  } else {
    return cvssVector;
  }
}

function updateAffectCvss(affect: ZodAffectType, newValue: string) {
  const cvssScoreIndex = affect.cvss_scores.findIndex(cvss => cvss.uuid == affectCvss(affect)?.uuid);
  const cvssId = affect.cvss_scores[cvssScoreIndex]?.uuid;
  if (newValue === '' && cvssScoreIndex !== -1 && affect.uuid && cvssId) {
    affect.cvss_scores[cvssScoreIndex].vector = '';
    affectCvssToDelete.value[affect.uuid] = cvssId;
  } else {
    if (affect.uuid && affectCvssToDelete.value[affect.uuid]) {
      delete affectCvssToDelete.value[affect.uuid];
    }
    if (cvssScoreIndex !== -1) {
      affect.cvss_scores[cvssScoreIndex].vector = newValue;
    } else if (newValue !== '') {
      affect.cvss_scores.push({
        issuer: 'RH',
        cvss_version: 'V3',
        comment: '',
        score: null,
        vector: newValue,
        embargoed: props.embargoed,
        alerts: [],
      });
    }
  }
}

function resolutionOptions(affect: ZodAffectType) {
  return affect?.affectedness
    ? possibleAffectResolutions[affect.affectedness]
    : [];
}

function affectRowTooltip(affect: ZodAffectType) {
  if (isRemoved(affect)) {
    return 'This affect will be deleted on save changes';
  } else if (isNewAffect(affect)) {
    return 'This affect will be created on save changes';
  } else if (isModified(affect)) {
    return 'This affect will be updated on save changes';
  } else {
    return '';
  }
}

// Affects Pagination
const totalPages = computed(() =>
  Math.ceil(sortedAffects.value.length / settings.value.affectsPerPage),
);

const minItemsPerPage = 5;
const maxItemsPerPage = 20;
const {
  changePage,
  currentPage,
  pages,
} = usePagination(totalPages, settings.value.affectsPerPage);

const paginatedAffects = computed(() => {
  const start = (currentPage.value - 1) * settings.value.affectsPerPage;
  const end = start + settings.value.affectsPerPage;
  return sortedAffects.value.slice(start, end);
});

function reduceItemsPerPage() {
  if (settings.value.affectsPerPage > minItemsPerPage) {
    settings.value.affectsPerPage--;
  }
}

function increaseItemsPerPage() {
  if (settings.value.affectsPerPage < maxItemsPerPage) {
    settings.value.affectsPerPage++;
  }
}

// Trackers
const allTrackers = computed(() => allAffects.value.flatMap(affect => affect.trackers));
const affectsManaging = ref<ZodAffectType[]>();

const displayedTrackers = computed(() => {
  return sortedAffects.value
    .filter(affect => !affectsToDelete.value.includes(affect))
    .flatMap(affect =>
      affect.trackers.map(tracker => ({
        ...tracker,
        ps_module: affect.ps_module,
      })),
    );
});

function fileTrackersForAffects(affects: ZodAffectType[]) {
  affectsManaging.value = affects;
  openModal();
}
</script>

<template>
  <div v-if="affects" class="osim-affects-section">
    <h4>Affected Offerings</h4>
    <div class="affect-modules-selection" :class="{'mb-4': affectedModules.length > 0 && modulesExpanded}">
      <LabelCollapsible
        :isExpanded="modulesExpanded"
        :isExpandable="hasAffects"
        @toggleExpanded="toggleModulesCollapse"
      >
        <template #label>
          <label class="form-label m-2">
            Affected Modules
          </label>
        </template>
        <template #buttons>
          <button
            v-if="selectedModules.length > 0"
            type="button"
            class="clear-modules-btn btn btn-primary btn-sm"
            @click="selectedModules = []"
          >
            Clear
          </button>
        </template>
        <template v-for="(moduleName) in affectedModules" :key="moduleName">
          <button
            v-if="moduleName"
            type="button"
            tabindex="-1"
            class="module-btn btn btn-sm"
            :class="{
              'btn-secondary': isModuleSelected(moduleName),
              'border-gray': !isModuleSelected(moduleName),
              'fw-bold': moduleTrackersCount(moduleName) === 0,
            }"
            :title="moduleName
              + (moduleTrackersCount(moduleName) === 0
                ? '\nThis module has no trackers associated'
                : '')"
            @click="handleModuleSelection(moduleName)"
          >
            <i
              v-if="moduleTrackersCount(moduleName) === 0"
              class="bi bi-exclamation-lg"
            />
            <span>{{ moduleName }}</span>
          </button>
        </template>
      </LabelCollapsible>
      <span v-if="affectedModules.length === 0" class="my-2 p-2">No modules to display</span>
    </div>
    <div class="affects-management">
      <div v-if="hasAffects" class="pagination-controls gap-1 my-2">
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
          v-for="page in pages"
          :key="page"
          tabindex="-1"
          class="osim-page-btn btn btn-sm rounded-0 btn-secondary"
          style="width: 34.8px;"
          :disabled="page === currentPage || page === '..'"
          @click.prevent="changePage(page as number)"
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
      <div class="affects-toolbar">
        <div class="badges my-auto gap-1" :class="{ 'me-3': hasAffects }">
          <div
            v-if="paginatedAffects.length > 0"
            class="per-page-btn btn btn-sm btn-secondary"
          >
            <i
              :style="settings.affectsPerPage > minItemsPerPage
                ? 'pointer-events: auto;'
                : 'opacity: 50%; pointer-events: none;'"
              class="bi bi-dash-square fs-6 my-auto"
              title="Reduce affects per page"
              @click="reduceItemsPerPage()"
            />
            <span class="mx-2 my-auto">{{ `Per page: ${settings.affectsPerPage}` }}</span>
            <i
              :style="settings.affectsPerPage < maxItemsPerPage
                ? 'pointer-events: auto;'
                : 'opacity: 50%; pointer-events: none;'"
              class="bi bi-plus-square fs-6 my-auto"
              title="Increase affects per page"
              @click="increaseItemsPerPage()"
            />
          </div>
          <div
            v-if="hasAffects"
            class="badge-btn btn btn-sm border-secondary"
            :class="displayMode === displayModes.ALL ? 'bg-secondary text-white' : 'bg-light-gray text-black'"
            :style="displayMode !== displayModes.ALL ? 'cursor: pointer' : 'cursor: auto'"
            :title="displayMode !== displayModes.ALL ? 'Display all affects' : 'Displaying all affects'"
            @click.stop="toggleDisplayMode(displayModes.ALL)"
          >
            <span>All affects {{ allAffects.length }}</span>
          </div>
          <div
            v-if="selectedAffects.length > 0"
            class="badge-btn btn btn-sm border-secondary"
            :class="displayMode === displayModes.SELECTED ? 'bg-secondary text-white' : 'bg-light-gray text-black'"
            :title="displayMode !== displayModes.SELECTED ? 'Display selected affects' : 'Displaying selected affects'"
            @click.stop="toggleDisplayMode(displayModes.SELECTED)"
          >
            <i class="bi bi-check-square me-1 h-fit" />
            <span>Selected {{ selectedAffects.length }}</span>
          </div>
          <div
            v-if="affectsBeingEdited.length > 0"
            class="badge-btn btn btn-sm bg-light-yellow"
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
            class="badge-btn btn btn-sm bg-light-green"
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
            class="badge-btn btn btn-sm"
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
            class="badge-btn btn btn-sm bg-light-blue"
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
            class="icon-btn btn btn-sm text-white"
            title="Commit changes on all affects being edited"
            @click.prevent="commitAllChanges()"
          >
            <i class="bi bi-check2-all fs-5 lh-sm" />
          </button>
          <button
            v-if="affectsBeingEdited.length > 0"
            type="button"
            class="icon-btn btn btn-sm text-white px-1"
            title="Cancel changes on all affects being edited"
            @click.prevent="cancelAllChanges()"
          >
            <i class="bi bi-x fs-4 lh-1" />
          </button>
          <button
            v-if="modifiedAffects.length > 0"
            type="button"
            class="icon-btn btn btn-sm text-white"
            title="Discard all affect modifications"
            @click.prevent="restoreAllSavedAffects()"
          >
            <i class="bi bi-backspace" />
          </button>
          <button
            v-if="affectsToDelete.length > 0"
            type="button"
            class="icon-btn btn btn-sm text-white"
            title="Recover all removed affects"
            @click.prevent="recoverAllAffects()"
          >
            <i class="bi-arrow-counterclockwise fs-5 lh-sm" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="icon-btn btn btn-sm text-white"
            title="Edit all selected affects"
            @click.prevent="editSelectedAffects()"
          >
            <i class="bi bi-pencil" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="icon-btn btn btn-sm text-white"
            title="Remove all selected affects"
            @click.prevent="removeSelectedAffects()"
          >
            <i class="bi bi-trash" />
          </button>
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="trackers-btn btn btn-sm btn-info"
            @click.prevent.stop="fileTrackersForAffects(selectedAffects)"
          >
            Manage Trackers
          </button>
          <button type="button" class="btn btn-sm text-white" @click.prevent="addNewAffect()">
            Add New Affect
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
                  v-model="affect.ps_module"
                  class="form-control"
                  @keydown="handleEdit($event, affect)"
                />
                <span v-else :title="affect.ps_module">
                  {{ affect.ps_module }}
                </span>
              </td>
              <td>
                <input
                  v-if="isBeingEdited(affect)"
                  v-model="affect.ps_component"
                  class="form-control"
                  @keydown="handleEdit($event, affect)"
                />
                <span v-else :title="affect.ps_component">
                  {{ affect.ps_component }}
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
              <td>
                <input
                  v-if="isBeingEdited(affect)"
                  class="form-control"
                  :value="affectCvss(affect)?.vector"
                  @input="updateAffectCvss(affect, ($event.target as HTMLInputElement).value)"
                  @keydown="handleEdit($event, affect)"
                />
                <span v-else>
                  {{ affectCvssDisplay(affect) }}
                </span>
              </td>
              <td>
                <div class="affect-tracker-cell">
                  <span class="me-2 my-auto">{{ affect.trackers.length }}</span>
                  <button
                    type="button"
                    :disabled="isBeingEdited(affect) || isRemoved(affect)"
                    class="btn btn-sm px-1 py-0 d-flex rounded-circle"
                    @click.prevent.stop="fileTrackersForAffects([affect])"
                  >
                    <i class="bi bi-plus lh-sm m-auto" />
                  </button>
                </div>
              </td>
              <td>
                <button
                  v-if="!isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm"
                  title="Edit affect"
                  tabindex="-1"
                  @click.stop="editAffect(affect)"
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  v-if="isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm"
                  title="Commit edit"
                  tabindex="-1"
                  @click.stop="commitChanges(affect)"
                >
                  <i class="bi bi-check2 fs-5 lh-sm" />
                </button>
                <button
                  v-if="!isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm"
                  title="Remove affect"
                  tabindex="-1"
                  @click.stop="removeAffect(affect)"
                >
                  <i class="bi bi-trash" />
                </button>
                <button
                  v-if="isBeingEdited(affect) && !affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm"
                  title="Cancel edit"
                  tabindex="-1"
                  @click.stop="cancelChanges(affect)"
                >
                  <i class="bi bi-x fs-5 lh-sm" />
                </button>
                <button
                  v-if="affectsToDelete.includes(affect)"
                  type="button"
                  class="btn btn-sm recover-btn"
                  title="Recover affect"
                  tabindex="-1"
                  @click.stop="emit('affect:recover', affect)"
                >
                  <i class="bi-arrow-counterclockwise fs-5 lh-sm" />
                </button>
                <button
                  v-if="!isBeingEdited(affect) && isModified(affect)"
                  type="button"
                  class="btn btn-sm"
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
      :affectsNotBeingDeleted="affects"
      :allTrackersCount="allTrackers.length"
      @affects:refresh="emit('affects:refresh')"
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
      <TrackerManager
        mode="modal"
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
  margin-block: 1rem;

  .affect-modules-selection {
    button {
      height: 2rem;
      padding-block: 0;
      margin: 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .clear-modules-btn {
      height: 1.5rem;
    }

    .module-btn {
      transition: color 0.15s background-color 0.15s;

      i {
        margin-inline: -3.5px;
        font-size: 1.125rem;
      }

      span {
        line-height: 2rem;
      }

      &:not(.btn-secondary):hover {
        background-color: $gray;
        border-color: $secondary !important;
      }
    }
  }

  .affects-management {
    .pagination-controls {
      display: flex;

      button {
        height: 2rem;
        padding-block: 0;

        &.osim-page-btn:disabled {
          background-color: transparent;
          color: black;
        }
      }
    }

    .affects-toolbar {
      display: flex;
      height: 32px;

      .badges {
        display: flex;

        .per-page-btn {
          display: flex;
          padding-block: 0;
          pointer-events: none;
        }

        > div {
          height: 32px;
          display: flex;

          span {
            margin: auto;
          }
        }

        > :not(:first-child).badge {
          user-select: none;
          transition:
            filter 0.25s,
            background-color 0.25s,
            border-color 0.25s;

          &:hover {
            filter: brightness(0.9);
          }
        }
      }

      .affects-table-actions {
        button {
          height: 32px;
          background-color: #212529;
          border-color: #212529;
          margin-inline: 0.1rem;

          &.icon-btn {
            width: 38px;
            height: 32px;
          }

          i {
            font-size: 1rem;
          }
        }

        .trackers-btn {
          background-color: #7ac7c7;
        }
      }
    }

    table {
      border-collapse: separate;

      tr {
        height: 39.2px;
      }

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
              width: 10%;
            }

            &:nth-of-type(4) {
              width: 14%;
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
              width: 28%;
            }

            &:nth-of-type(9) {
              width: 8%;
            }

            &:nth-of-type(10) {
              width: 6%;
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

      tbody {
        tr {
          position: relative;
          transition: filter 0.25s;

          td {
            transition:
              background-color 0.5s,
              color 0.5s,
              border-color 0.25s;
            padding-block: 0.2rem;
            border-block: 0.2ch solid #e0e0e0;
            background-color: #e0e0e0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 150px;

            .row-right-indicator {
              right: -42px;
            }

            .row-left-indicator {
              left: -42px;
            }

            .row-left-indicator,
            .row-right-indicator {
              position: absolute;
              opacity: 0;
              transition:
                opacity 0.5s,
                right 0.5s,
                left 0.5s;
              top: 0;
            }

            .btn {
              display: inline;
              margin-inline: 0.1rem;
              width: 28px;
              height: 25px;
              padding: 0 0.1rem;
              transition:
                background-color 0.5s,
                color 0.5s;
              border: none;
              background-color: #212529;
              color: white;

              .bi {
                line-height: 0;
                font-size: 0.938rem;
              }
            }

            input,
            select {
              padding: 0.15rem 0.5rem;
            }

            .affect-tracker-cell {
              display: flex;

              .btn {
                width: 26px;
                height: 26px;

                .bi {
                  font-size: 1.125rem;
                }
              }
            }
          }

          :not(.editing) td {
            user-select: none;
          }

          &:hover {
            filter: brightness(0.9);

            td {
              border-color: #707070bf;
            }
          }
        }

        tr.selected td {
          .row-left-indicator,
          .row-right-indicator {
            opacity: 100;
          }

          .row-right-indicator {
            right: -24px !important;
          }

          .row-left-indicator {
            left: -24px !important;
          }
        }

        tr.editing td {
          border-color: $light-yellow !important;
          background-color: $light-yellow;
          color: #73480b;

          .btn {
            background-color: #73480b;
          }
        }

        tr.modified td {
          border-color: $light-green !important;
          background-color: $light-green;
          color: #204d00;

          .btn {
            background-color: #204d00;
          }
        }

        tr.new td {
          border-color: #e0f0ff !important;
          background-color: #e0f0ff;
          color: #036;

          .btn {
            background-color: #036;
          }
        }

        tr.removed td {
          border-color: #ffe3d9 !important;
          background-color: #ffe3d9;
          color: #731f00;

          .btn {
            background-color: #731f00;
          }
        }

        tr.editing:hover td {
          border-color: #73470a80 !important;
        }

        tr.modified:hover td {
          border-color: #204d0080 !important;
        }

        tr.new:hover td {
          border-color: #00336680 !important;
        }

        tr.removed:hover td {
          border-color: #731f0080 !important;
        }
      }
    }
  }

  #impact-filter > .bi,
  #resolution-filter > .bi,
  #affectedness-filter > .bi {
    font-size: 1rem;
  }
}
</style>
