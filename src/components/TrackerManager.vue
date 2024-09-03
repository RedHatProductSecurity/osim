<script setup lang="ts">
import { toRefs, computed, ref } from 'vue';

import TabsDynamic from '@/components/widgets/TabsDynamic.vue';

import type { UpdateStreamOsim, UpdateStreamSelections } from '@/composables/useTrackersForSingleFlaw';
import { useTrackersForRelatedFlaws } from '@/composables/useTrackersForRelatedFlaws';

import type { ZodFlawType } from '@/types/zodFlaw';

const props = defineProps<{
  flaw: ZodFlawType;
  relatedFlaws: ZodFlawType[];
}>();

const emit = defineEmits<{
  'affects-trackers:hide': [];
  'affects-trackers:refresh': [];
}>();

const { relatedFlaws } = toRefs(props);

const shouldApplyToRelated = ref(true);

const {
  addRelatedFlaw,
  affectsBySelectedFlawId,
  fileTrackers,
  filterString,
  isFilingTrackers,
  isLoadingTrackers,
  multiFlawTrackers,
  shouldFileAsMultiFlaw,
  synchronizeTrackerSelections,
  trackersToFile,
} = useTrackersForRelatedFlaws(props.flaw, relatedFlaws);

const selectedRelatedFlawIds = computed(() => Object.keys(affectsBySelectedFlawId.value));

const hasRelatedFlawSelections = computed(() => selectedRelatedFlawIds.value.length > 1);

const relatedFlawIds = computed(() =>
  relatedFlaws.value.map(flaw => flaw.cve_id || flaw.uuid)
    .filter(id => !selectedRelatedFlawIds.value.includes(id)),
);

function updateSelection(trackerSelections: UpdateStreamSelections, tracker: UpdateStreamOsim) {
  const isSelected = trackerSelections.get(tracker);
  trackerSelections.set(tracker, !isSelected);
  if (shouldApplyToRelated.value) {
    synchronizeTrackerSelections(trackerSelections);
  }
}

function handleSetAll(tabProps: any, isSelected: boolean) {
  tabProps.setAllTrackerSelections(isSelected);
  if (shouldApplyToRelated.value) {
    synchronizeTrackerSelections(tabProps.trackerSelections);
  }
}

function clearFilter() {
  filterString.value = '';
}

async function handleFileTrackers() {
  await fileTrackers();
  emit('affects-trackers:refresh');
}

//  TASKS
// TODO: where are sortedFilteredTrackers and availableUpdateStreams missing from?
// TODO: place isLoading in the correct place
// TODO: try to preserve carlos' formatting

</script>

<template>
  <div class="mt-3 mb-2 osim-tracker-manager py-1 px-3">
    <h4 class="mb-2">
      Tracker Manager
      <button
        type="button"
        class="btn btn-lightest-info btn-outline-dark-teal btn-sm"
        @click="emit('affects-trackers:hide')"
      >
        <i class="bi bi-eye-slash-fill"></i>
        Hide
      </button>
    </h4>

    <div class="osim-trackers-filing mb-2">
      <div class="osim-tracker-manager-controls">
        <input
          v-model="filterString"
          type="text"
          class="p-1 ps-2 mt-2 mb-3 border border-info"
          placeholder="Filter Modules/Components..."
        />
        <button
          v-show="filterString"
          type="button"
          class="btn btn-sm btn-white btn-outline-dark-teal border-0 my-2 ms-1"
          @click="clearFilter"
        >
          <i class="bi bi-x"></i>
        </button>
        <label
          v-if="hasRelatedFlawSelections"
          class="form-check form-switch h-100 ms-5 p-1 d-inline-block"
        >
          <input
            v-model="shouldApplyToRelated"
            type="checkbox"
            class="form-check-input info"
          />
          <span class="form-check-label">
            Apply selections to all related flaws
          </span>
        </label>
      </div>
      <TabsDynamic
        :labels="selectedRelatedFlawIds"
        :slotProps="multiFlawTrackers"
        :addableItems="relatedFlawIds"
        @add-tab="addRelatedFlaw"
      >
        <template
          v-for="(relatedFlawAffects, flawCveOrId) in affectsBySelectedFlawId"
          :key="flawCveOrId"
          #[flawCveOrId]="tabProps"
        >
          <div class="osim-tracker-tabs">
            <div v-if="tabProps.untrackableAffects?.length > 0" class="pt-5 p-3">
              <div class="alert alert-danger">
                <h5>Untrackable Affects</h5>
                <p>
                  These affects do not have available trackers. This may indicate an issue with product defintions.
                  Please contact the OSIDB/OSIM team for assistance.
                </p>
                <div class="osim-tracker-list">
                  <span
                    v-for="affect in tabProps.untrackableAffects"
                    :key="`${affect.ps_module}-${affect.ps_component}`"
                  >
                    <span class="ps-1 text-danger">
                      <i class="bi bi-exclamation-triangle"></i>
                      {{ affect.ps_module }}/{{ affect.ps_component }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-6">

                <div class="d-flex justify-content-between">
                  <h5 class="pt-3">
                    Unfiled
                  </h5>
                  <div class="pt-3 pe-2">
                    <button
                      type="button"
                      class="btn btn-white btn-outline-dark-teal btn-sm me-2"
                      @click="handleSetAll(tabProps, true)"
                    >
                      <i class="bi bi-check-all"></i>
                      Select
                      {{ tabProps.filterString ? 'Filtered' : 'All' }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-white btn-outline-dark-teal btn-sm me-2"
                      @click="handleSetAll(tabProps, false)"
                    >
                      <i class="bi bi-eraser"></i>
                      Deselect
                      {{ tabProps.filterString ? 'Filtered' : 'All' }}
                    </button>
                  </div>
                </div>
                <div class="ms-3 mt-2 pb-3">
                  <div v-if="tabProps.unselectedStreams?.length" class="osim-tracker-list my-2">
                    <label
                      v-for="(tracker, index) in tabProps.unselectedStreams"
                      :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
                    >
                      <input
                        :checked="tabProps.trackerSelections.get(tracker)"
                        type="checkbox"
                        class="osim-tracker form-check-input"
                        @input="updateSelection(tabProps.trackerSelections, tracker)"
                      />
                      <span
                        class="osim-tracker-label"
                        :class="{'osim-suggested-tracker': tracker.selected}"
                      >
                        <span>{{ `${tracker.ps_update_stream}` }}</span>
                        <span class="ms-2 fst-italic pe-1">{{ `${tracker.ps_component}` }}</span>
                        <span
                          v-if="tracker.selected"
                          title="Suggested Tracker"
                          class="ps-1"
                        >
                          <i class="bi bi-box-arrow-in-right">
                            <span class="visually-hidden"> Suggested Tracker </span>
                          </i>
                        </span>
                      </span>
                    </label>
                  </div>
                  <div v-if="tabProps.selectedStreams?.length" class="osim-tracker-list my-2">
                    <label
                      v-for="(tracker, index) in tabProps.selectedStreams"
                      :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
                    >
                      <input
                        :checked="tabProps.trackerSelections.get(tracker)"
                        type="checkbox"
                        class="osim-tracker form-check-input"
                        @input="updateSelection(tabProps.trackerSelections, tracker)"
                      />
                      <span
                        class="osim-tracker-label"
                        :class="{'osim-suggested-tracker': tracker.selected}"
                      >
                        <span>{{ `${tracker.ps_update_stream}` }}</span>
                        <span class="ms-2 fst-italic pe-1">{{ `${tracker.ps_component}` }}</span>
                        <span
                          v-if="tracker.selected"
                          title="Suggested Tracker"
                          class="ps-1"
                        >
                          <i class="bi bi-box-arrow-in-right">
                            <span class="visually-hidden"> Suggested Tracker </span>
                          </i>
                        </span>
                      </span>
                    </label>
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-dark-teal text-white osim-file-trackers mt-2"
                    :disabled="!trackersToFile.length || isFilingTrackers"
                    @click="handleFileTrackers"
                  >
                    <i v-if="!isFilingTrackers" class="bi bi-archive"></i>
                    <i v-else v-osim-loading.grow="isFilingTrackers"></i>
                    File Selected Trackers
                  </button>
                  <label
                    v-if="hasRelatedFlawSelections"
                    class="form-switch ms-5 p-1"
                  >
                    <input
                      v-model="shouldFileAsMultiFlaw"
                      type="checkbox"
                      class="form-check-input info"
                    />
                    <span class="ms-2 d-inline-block text-nowrap">
                      File as MultiFlaw
                    </span>
                  </label>
                </div>
              </div>
              <div v-if="isLoadingTrackers" class="ms-2 mb-1">
                <span
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                >
                  <span class="visually-hidden">Loading...</span>
                </span>
                <span>Loading trackers&hellip;</span>
              </div>
              <div v-if="!isLoadingTrackers">
                <div v-if="tabProps.alreadyFiledTrackers?.length === 0" class="ms-2">
                  <span> No filed trackers&hellip; </span>
                </div>
                <div v-if="tabProps.alreadyFiledTrackers?.length > 0" class="osim-tracker-list">
                  <div class="col-6">
                    <h5 class="pt-3 mb-2 pb-2">Filed</h5>
                    <div class="osim-tracker-list my-2">
                      <label
                        v-for="(tracker, index) in tabProps.alreadyFiledTrackers"
                        :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
                      >
                        <input
                          checked
                          disabled
                          type="checkbox"
                          class="osim-tracker form-check-input"
                        />
                        <span
                          class="osim-tracker-label"
                          :class="{'osim-suggested-tracker': tracker.selected}"
                        >
                          <span>{{ `${tracker.ps_update_stream}` }}</span>
                          <span class="ms-2 fst-italic pe-1">{{ `${tracker.ps_component}` }}</span>
                          <span
                            v-if="tracker.selected"
                            title="Suggested Tracker"
                            class="ps-1"
                          >
                            <i class="bi bi-box-arrow-in-right">
                              <span class="visually-hidden"> Suggested Tracker </span>
                            </i>
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div></template>
      </TabsDynamic>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/scss/bootstrap-overrides';

details:not([open]) h5 {
  margin-bottom: 0;
}

.osim-tracker-manager-controls {
  position: relative;

  input[type='text'] {
    width: 30ch;
  }

  button {
    position: absolute;
    top: 2.5px;
    left: calc(30ch - 1px);
  }
}

label {
  padding: 0.125rem;
  margin: 0;

  .osim-tracker-label {
    padding-left: 0.125rem;
  }

  input[type='checkbox'].osim-tracker {
    margin-top: 0.1875rem;
    margin-right: 0.375rem;
    border-color: $dark-teal;

    &:checked {
      background-color: $dark-teal;
      border-color: $dark-teal;
    }

    &:active {
      outline: 2px solid rgba($info, 0.5);
      border-color: $info;
    }

    &:focus {
      outline: 2px solid rgba($info, 0.5);
      border-color: $info;
    }
  }
}

.osim-suggested-tracker {
  padding-right: 0.25rem;
  background-color: $lighter-info;

  i {
    margin-right: 0.25rem;
  }
}

:deep(.nav-tabs) {
  border-bottom-color: $info;
  flex-flow: row wrap-reverse;

  .nav-item .nav-link {
    color: $info;
    border: none;
    background-color: $lighter-info;
    margin-right: 0.5rem;

    &:not(.active) {
      box-shadow: inset 1px 1px 0 rgba($info, 0.5);
    }

    &.active {
      background-color: $lightest-info;
      color: $dark-teal;
      border-top: 1px solid $info;
      border-left: 1px solid $info;
      border-right: 1px solid $info;
    }

    &.osim-add-tab {
      background-color: #fff;
      color: $info;
      border: none;
      box-shadow: none;
      padding: 0.125rem 0.55rem;
      padding-bottom: 0.125rem;

      i {
        font-size: 1.5rem;
      }

      &:hover {
        background-color: $info;
        color: #fff;
      }
    }
  }
}

.osim-tracker-tabs {
  border-left: 1px solid $info;
  padding-left: 1rem;
  margin: 0;
  background-color: $lightest-info;
}

.osim-tracker-list {
  display: flex;
  flex-flow: column;
  max-height: 30vh;
  margin-right: 1rem;
  overflow-y: auto;
  background-color: #fff;

  &:has(label) {
    padding: 0.25rem;
    border: 1px solid $info;
  }
}

.osim-trackers-filing {
  overflow: hidden;
}

.osimtracker-manageraffect-trackers-container {
  border-left: 5px solid $info;
  background-color: $light-info;
  border-radius: 5px;

  .btn-white:not(:hover) {
    background-color: #fff;
    color: dark-teal;
  }
}

.osim-tracker-selection-disabled {
  text-decoration: strike-through;
  font-style: italic;
  color: gray;
}

button.osim-file-trackers:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.btn-black {
  background-color: #212529;
  transition:
    background-color 0.25s,
    outline-color 0.25s;

  &:hover {
    background-color: #212529;
  }

  &:disabled {
    background-color: white;
    color: black;
  }
}
</style>
