<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

import { storeToRefs } from 'pinia';

import FlawTrackers from '@/components/FlawTrackers/FlawTrackers.vue';
import TrackerManager from '@/components/TrackerManager/TrackerManager.vue';
import FlawAffectsTable from '@/components/FlawAffects/FlawAffectsTable.vue';

import { useModal } from '@/composables/useModal';
import { usePaginationWithSettings } from '@/composables/usePaginationWithSettings';
import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';
import { useFlaw } from '@/composables/useFlaw';

import Modal from '@/widgets/Modal/Modal.vue';
import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';
import type { ZodAffectType, ZodFlawType } from '@/types';
import { CVSS_V3 } from '@/constants';
import { useSettingsStore } from '@/stores/SettingsStore';
import { uniques } from '@/utils/helpers';
import { IssuerEnum } from '@/generated-client';
import { useAffectsEditingStore } from '@/stores/AffectsEditingStore';

import { displayModes } from './flawAffectConstants';
import { useFilterSortAffects } from './useFilterSortAffects';

const props = defineProps<{
  embargoed: boolean;
  errors: null | Record<string, any>;
  relatedFlaws: ZodFlawType[];
}>();

const { flaw } = useFlaw();

const affectsEditingStore = useAffectsEditingStore();
const {
  cancelAllChanges,
  commitAllChanges,
  editSelectedAffects,
  getAffectPriorEdit,
  isAffectSelected,
  isBeingEdited,
  resetSelections,
  revertAffectToLastSaved,
  toggleAffectSelection,
} = affectsEditingStore;

const { affectsBeingEdited, selectedAffects } = storeToRefs(affectsEditingStore);

const { settings } = useSettingsStore();
const {
  closeModal,
  isModalOpen: isManageTrackersModalOpen,
  openModal,
} = useModal();

const {
  addAffect,
  affectsToDelete,
  isAffectBeingRemoved,
  modifiedAffects, // TODO: move to composable?
  recoverAffect,
  refreshAffects,
  removeAffect,
  updateAffectCvss,
} = useFlawAffectsModel();

const {
  filterAffects,
  selectedModules,
  sortAffects,
} = useFilterSortAffects();

const displayMode = ref(displayModes.ALL);

const allAffects = computed((): ZodAffectType[] => affectsToDelete.value.concat(flaw.value.affects));

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

const sortedAffects = computed(() => {
  const filteredAffects = filterAffects(displayedAffects.value);
  const uneditedFilteredAffects = filteredAffects.map(
    affect => isBeingEdited(affect) ? getAffectPriorEdit(affect) : affect,
  );
  return sortAffects(uneditedFilteredAffects, false);
});

const {
  changePage,
  currentPage,
  decreaseItemsPerPage,
  increaseItemsPerPage,
  maxItemsPerPage,
  minItemsPerPage,
  pages,
  paginatedItems: paginatedAffects,
  totalPages,
} = usePaginationWithSettings(sortedAffects, { setting: 'affectsPerPage' });

const modulesExpanded = ref(true);
const specificAffectsToTrack = ref<ZodAffectType[]>([]);

const affectedModules = computed(() => uniques(sortAffects(allAffects.value, true).map(affect => affect.ps_module)));
const hasAffects = computed(() => allAffects.value.length > 0);

watch(flaw.value.affects, (newAffects) => {
  if (newAffects.length <= 0) {
    setDisplayMode(displayModes.ALL);
  }
});

onUnmounted(resetSelections);

function setDisplayMode(mode: displayModes) {
  if (displayMode.value === mode) {
    displayMode.value = displayModes.ALL;
  } else {
    displayMode.value = mode;
  }
}

function toggleModulesCollapse() {
  modulesExpanded.value = !modulesExpanded.value;
}

function moduleTrackersCount(moduleName: string) {
  return flaw.value.affects
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

function moduleBtnTooltip(moduleName: string) {
  return moduleName
    + (moduleTrackersCount(moduleName) === 0
      ? '\nThis module has no trackers associated'
      : '');
}

function revertAllAffects() {
  const affectsToRestore = [...modifiedAffects.value];
  affectsToRestore.forEach((affect) => {
    if (!affectsBeingEdited.value.includes(affect)) {
      revertAffectToLastSaved(affect);
    }
  });
}

// Create affects
const newAffects = computed(() => flaw.value.affects.filter(affect => !affect.uuid));

function addNewAffect() {
  addAffect({
    embargoed: props.embargoed,
    affectedness: 'NEW',
    resolution: '',
    delegated_resolution: '',
    ps_module: `NewModule-${newAffects.value.length}`,
    ps_component: `NewComponent-${newAffects.value.length}`,
    impact: '',
    cvss_scores: [{
      // affect: z.string().uuid(),
      cvss_version: CVSS_V3,
      issuer: IssuerEnum.Rh,
      comment: '',
      score: null,
      vector: '',
      embargoed: props.embargoed,
      alerts: [],
    }],
    trackers: [],
    alerts: [],
  });
}

// Remove affects
function handleRemove(affect: ZodAffectType) {
  if (isAffectSelected(affect)) toggleAffectSelection(affect);
  removeAffect(affect);
}

function removeSelectedAffects() {
  selectedAffects.value.forEach(handleRemove);
}

function recoverAllAffects() {
  const affectsToRecover = [...affectsToDelete.value];
  affectsToRecover.forEach(recoverAffect);
}

// Trackers
function trackSpecificAffect(affect: ZodAffectType) {
  specificAffectsToTrack.value = [affect];
  openModal();
}

function openManageTrackersModal() {
  specificAffectsToTrack.value = selectedAffects.value;
  openModal();
}

function closeManageTrackersModal() {
  specificAffectsToTrack.value = [];
  closeModal();
}

const allTrackers = computed(() => allAffects.value.flatMap(affect => affect.trackers));

const displayedTrackers = computed(() => {
  return sortedAffects.value
    .filter(affect => !isAffectBeingRemoved(affect) && affect.uuid)
    .flatMap(affect =>
      affect.trackers.map(tracker => ({
        ...tracker,
        ps_module: affect.ps_module,
        ps_component: affect.ps_component,
      })),
    );
});
</script>

<template>
  <div v-if="flaw.affects" class="osim-affects-section">
    <h4>Affected Offerings</h4>
    <div class="affect-modules-selection" :class="{'mb-4': affectedModules.length > 0 && modulesExpanded}">
      <LabelCollapsible
        v-if="affectedModules.length > 0"
        :isExpanded="modulesExpanded"
        :isExpandable="hasAffects"
        :iconClose="null"
        :iconOpen="null"
        @toggleExpanded="toggleModulesCollapse"
      >
        <template #label>
          <label class="form-label mt-2 btn btn-sm btn-secondary">
            <i :class="modulesExpanded?'bi-funnel-fill':'bi-funnel'"></i>
            Affected Module Filters
          </label>
        </template>
        <template #buttons>
          <button
            v-if="selectedModules.length > 0"
            type="button"
            class="mt-2 mb-0 btn btn-primary btn-sm"
            @click="selectedModules = []"
          >
            <i class="bi bi-x" />
            Clear Filters
          </button>
        </template>
        <div class="d-inline-block bg-light-gray p-2">
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
              :title="moduleBtnTooltip(moduleName)"
              @click="handleModuleSelection(moduleName)"
            >
              <i
                v-if="moduleTrackersCount(moduleName) === 0"
                class="bi bi-exclamation-lg"
              />
              <span>{{ moduleName }}</span>
            </button>
          </template>
        </div>
      </LabelCollapsible>
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
              @click="decreaseItemsPerPage()"
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
            @click.stop="setDisplayMode(displayModes.ALL)"
          >
            <span>All affects {{ allAffects.length }}</span>
          </div>
          <div
            v-if="selectedAffects.length > 0"
            class="badge-btn btn btn-sm border-secondary"
            :class="displayMode === displayModes.SELECTED ? 'bg-secondary text-white' : 'bg-light-gray text-black'"
            :title="displayMode !== displayModes.SELECTED ? 'Display selected affects' : 'Displaying selected affects'"
            @click.stop="setDisplayMode(displayModes.SELECTED)"
          >
            <i class="bi bi-check-square me-1 h-fit" />
            <span>Selected {{ selectedAffects.length }}</span>
          </div>
          <div
            v-if="affectsBeingEdited?.length > 0"
            class="badge-btn btn btn-sm bg-light-yellow"
            style="border-color: #73480b !important; color: #73480b;"
            :style="displayMode === displayModes.EDITING
              ? 'background-color: #73480b !important; color: #fff4cc;' : ''"
            :title="displayMode === displayModes.EDITING ? 'Displaying editing affects' :'Display editing affects'"
            @click.stop="setDisplayMode(displayModes.EDITING)"
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
            @click.stop="setDisplayMode(displayModes.MODIFIED)"
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
            @click.stop="setDisplayMode(displayModes.DELETED)"
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
            @click.stop="setDisplayMode(displayModes.CREATED)"
          >
            <i class="bi bi-plus-lg me-1 h-fit" />
            <span>Added {{ newAffects.length }}</span>
          </div>
        </div>
        <div class="affects-table-actions ms-auto">
          <button
            v-if="selectedAffects.length > 0"
            type="button"
            class="trackers-btn btn btn-sm btn-info border-dark-info"
            :title="`Manage trackers for ${selectedAffects.length} selected affect(s)`"
            @click.prevent.stop="openManageTrackersModal"
          >
            <!-- Manage Trackers for {{ selectedAffects.length }} Affect(s) -->
            <span>Manage Trackers</span>
            <span class="bg-dark-info ms-1 text-white rounded-pill px-2">{{ selectedAffects.length }} </span>
          </button>
          <button
            v-if="affectsBeingEdited?.length > 0"
            type="button"
            class="icon-btn btn btn-sm text-white"
            title="Commit changes on all affects being edited"
            @click.prevent="commitAllChanges()"
          >
            <i class="bi bi-check2-all fs-5 lh-sm" />
          </button>
          <button
            v-if="affectsBeingEdited?.length > 0"
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
            @click.prevent="revertAllAffects"
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
          <button type="button" class="btn btn-sm text-white" @click.prevent="addNewAffect()">
            Add New Affect
          </button>
        </div>
      </div>
      <FlawAffectsTable
        v-model:affects="paginatedAffects"
        :errors="errors"
        :selectedModules="selectedModules"
        :totalPages="totalPages"
        @affects:display-mode="setDisplayMode"
        @affect:remove="handleRemove"
        @affect:toggle-selection="toggleAffectSelection"
        @affect:track="trackSpecificAffect"
        @affect:updateCvss="updateAffectCvss"
      />
      <span v-if="!hasAffects" class="my-2 p-2 d-flex">
        This flaw has no affects
      </span>
      <span v-else-if="hasAffects && totalPages === 0" class="my-2 p-2 d-flex">
        No affects found for current filters
      </span>
    </div>
    <FlawTrackers
      :flaw="flaw"
      :relatedFlaws="relatedFlaws"
      :displayedTrackers="displayedTrackers"
      :affectsNotBeingDeleted="flaw.affects"
      :allTrackersCount="allTrackers.length"
      @affects:refresh="refreshAffects"
    />
    <div class="osim-tracker-manager-modal-container">
      <Modal :show="isManageTrackersModalOpen" style="max-width: 75%;" @close="closeManageTrackersModal">
        <template #body>
          <button
            type="button"
            class="btn btn-close ms-auto"
            aria-label="Close"
            @click="closeManageTrackersModal"
          />
          <TrackerManager
            :relatedFlaws="relatedFlaws"
            :flaw="flaw"
            :specificAffectsToTrack="specificAffectsToTrack"
          />
        </template>
      </Modal>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

.osim-affects-section {
  padding-bottom: 100px;
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

    .module-btn {
      transition: color 0.15s background-color 0.15s;

      i {
        margin-inline: -3.5px;
        font-size: 1.125rem;
      }

      span {
        line-height: 2rem;
      }

      &:not(.btn-secondary) {
        background-color: #fff;

        &:hover {
          background-color: $gray;
          border-color: $secondary !important;
        }
      }
    }
  }

  :deep(.osim-collapsible-label) {
    & > button.osim-collapsible-toggle label {
      margin-bottom: 0 !important;
    }

    & > div.ps-3 {
      padding: 0 !important;
    }

    & div.border-start {
      margin-left: 0.5rem;
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

            &.bi-bug {
              line-height: 1;
            }
          }

          span:has(i.bi-bug) {
            padding-top: 0.1rem;
            padding-bottom: 0.1rem;
          }
        }

        .trackers-btn {
          background-color: #7ac7c7;
        }
      }
    }
  }

  #impact-filter > .bi,
  #resolution-filter > .bi,
  #affectedness-filter > .bi {
    font-size: 1rem;
  }

  .osim-tracker-manager-modal-container {
    &:deep(.modal-body) {
      position: relative;
      padding: 0;

      .osim-affect-trackers-container {
        margin: 0 !important;

        .osim-hide-tracker-manager {
          display: none;
        }
      }
    }

    :deep(.btn-close) {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }
  }
}
</style>
