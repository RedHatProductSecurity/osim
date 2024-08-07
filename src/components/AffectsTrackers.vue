<script setup lang="ts">
import { toRefs, computed, ref } from 'vue';

import { type ZodAffectType } from '@/types/zodAffect';
import { type ZodFlawType } from '@/types/zodFlaw';

import { useTrackersForRelatedFlaws } from '@/composables/useTrackersForRelatedFlaws';

import TabsDynamic from '@/components/widgets/TabsDynamic.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';

const props = defineProps<{
  flawId: string;
  relatedFlaws: ZodFlawType[];
  theAffects: ZodAffectType[];
}>();

const { theAffects, relatedFlaws } = toRefs(props);

const emit = defineEmits<{
  'affects-trackers:hide': [];
  'affects-trackers:refresh': [];
}>();


const shouldApplyToRelated = ref(true);

const hasRelatedFlaws = computed(() => relatedFlaws.value.length > 1);

const {
  multiFlawTrackers,
  relatedAffects,
  isFilingTrackers,
  trackersToFile,
  synchronizeTrackerSelections,
  fileTrackers,
} = useTrackersForRelatedFlaws(theAffects, relatedFlaws);

function updateSelection(trackerSelections: Map<any, any>, tracker: any) {
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

async function handleFileTrackers() {
  await fileTrackers();
  emit('affects-trackers:refresh');
}


</script>

<template>
  <div class="mt-3 mb-2 osim-affect-trackers-container py-1 px-3">
    <h4 class="mb-2">
      Manage Trackers
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
      <div v-if="hasRelatedFlaws">
        <LabelCheckbox
          v-model="shouldApplyToRelated"
          label="Apply selections to all related flaws"
        />
      </div>
      <TabsDynamic :labels="Object.keys(relatedAffects)" :slotProps="multiFlawTrackers">
        <template
          v-for="(relatedFlawAffects, flawCveOrId) in relatedAffects"
          :key="flawCveOrId"
          #[flawCveOrId]="tabProps"
        >
          <div class="osim-tracker-tabs">
            <div
              v-if="tabProps.alreadyFiledTrackers.length"
              class="osim-tracker-list my-2"
            >
              <h5>Filed</h5>
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
            <div v-if="tabProps.untrackableAffects.length > 0">
              <div class="ms-3 alert alert-danger w-50">
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
            <h5 class="pt-2">
              Unfiled
            </h5>
            <div class="ms-3 mt-2 pb-3">
              <div class="row">
                <div class="col mb-2">
                  <button
                    type="button"
                    class="btn btn-white btn-outline-dark-teal btn-sm me-2"
                    @click="handleSetAll(tabProps, true)"
                  >
                    <i class="bi bi-check-all"></i>
                    Select All
                    {{ tabProps.filterString ? 'Filtered' : '' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-white btn-outline-dark-teal btn-sm me-2"
                    @click="handleSetAll(tabProps, false)"
                  >
                    <i class="bi bi-eraser"></i>
                    Deselect All
                    {{ tabProps.filterString ? 'Filtered' : '' }}
                  </button>
                </div>
              </div>
              <div class="row">
                <div class="col-6">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h6 class="me-2 ">Unselected</h6>
                    </div>
                    <div>
                      <span class="osim-suggested-tracker ps-2 me-3">
                        <span class="pe-1">Suggested Trackers</span>
                        <i class="bi bi-box-arrow-in-right" />
                      </span>
                    </div>
                    <!-- <caption class="ms-4 mt-0"> -->
                  </div>
                  <!-- </caption> -->
                </div>
                <div class="col-6">
                  <h6>Selected</h6>
                </div>
              </div>
              <div class="row">
                <div class="col-6 pt-1">
                  <div class="osim-tracker-list mb-2">
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
                </div>
                <div class="col-6 pt-1">
                  <div class="osim-tracker-list mb-2">
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
                </div>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-dark-teal text-white osim-file-trackers mt-3"
                :disabled="!trackersToFile.length || isFilingTrackers"
                @click="handleFileTrackers"
              >
                <i v-if="!isFilingTrackers" class="bi bi-archive"></i>
                <i v-else v-osim-loading.grow="isFilingTrackers"></i>
                File Selected Trackers
              </button>
            </div>
          </div>
        </template>
      </TabsDynamic>
    </div>
  </div>

</template>

<style lang="scss" scoped>
@import '@/scss/bootstrap-overrides';

label{
  padding: 0.125rem ;
  margin: 0;

  .osim-tracker-label {
    padding-left: 0.125rem;
  }

  input[type="checkbox"].osim-tracker {
    margin-top: .1875rem;
    margin-right: .375rem;
    border-color: $dark-teal;

    &:checked {
      background-color: $dark-teal;
      border-color: $dark-teal;
    }

    &:active {
      outline: 2px solid rgba($info, 0.5) ;
      border-color: $info;
    }

    &:focus {
      outline: 2px solid rgba($info, 0.5) ;
      border-color: $info;
    }
  }
}

.osim-suggested-tracker {
  padding-right: .25rem;
  background-color: $lighter-info;

  i {
    margin-right: .25rem;
  }
}

:deep(.nav-tabs) {
  border-bottom-color: $info;

  .nav-item .nav-link {
    color: $info;
    border: none;
    background-color: $lighter-info;

    &.active {
      color: $dark-teal;
      border: 1px solid $info;
      border-bottom: none;
      background-color:white;
    }
  }
}

.osim-tracker-tabs {
  border-left: 1px solid $info;
  padding-left: 1rem;
  margin:0;
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
    padding: .25rem;
    border: 1px solid $info;
  }
}

.osim-trackers-filing {
  overflow: hidden;
}

.osim-affect-trackers-container {
  border-left: 5px solid $info;
  background-color: $light-info;
  border-radius: 5px;

  .btn-white:not(:hover) {
    background-color: #fff;
    color: dark-teal;
  }
}

h3, h4, h5, h6 {
  color: #147878;
}

.osim-tracker-selection-disabled {
  text-decoration: strike-through;
  font-style: italic;
  color: gray;
}

button.osim-file-trackers:disabled {
  cursor: not-allowed;
  opacity: .3;
}
</style>
