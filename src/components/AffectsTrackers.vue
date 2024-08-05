<script setup lang="ts">
import { toRefs, computed, watch, ref } from 'vue';

import { type ZodAffectType } from '@/types/zodAffect';
import { type ZodFlawType } from '@/types/zodFlaw';
import { useTrackersForSingleFlaw } from '@/composables/useTrackersForSingleFlaw';
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

// type MultiFlawTrackers = Record<string, ReturnType<typeof useTrackers>>;

// const multiFlawTrackers = ref<MultiFlawTrackers>({});
// const filterString = ref('');

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


console.log('relatedFlaws in AffectsTracker', relatedFlaws.value);

function updateSelection(trackerSelections: Map<any, any>, tracker: any) {
  console.log('trackerSelections', trackerSelections);
  const isSelected = trackerSelections.get(tracker);
  console.log(isSelected);
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
  // synchronizeTrackerSelections();
  // for (const [, { fileTrackers }] of Object.entries(multiFlawTrackers.value)) {
  //   console.log(fileTrackers, multiFlawTrackers.value);
  //   await fileTrackers();
  //   fileTrackers().then(() => {
  //     emit('affects-trackers:refresh');
  //   });
  // }
  // emit('affects-trackers:refresh');
}


</script>

<template>
  <div class="mt-3 mb-2 osim-affect-trackers-container py-1 px-3">
    <h4 class="mb-2">
      Manage Trackers
      <button
        type="button"
        class="btn btn-white btn-outline-black btn-sm"
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
          <div
            v-if="tabProps.alreadyFiledTrackers.length"
            class="osim-tracker-list mb-2"
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
              {{ `${tracker.ps_update_stream} (${tracker.ps_component})` }}
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
          <h5>
            Unfiled
          </h5>
          <div class="ms-3 mt-2">
            <div class="row">
              <div class="col mb-2">
                <button
                  type="button"
                  class="btn btn-white btn-outline-black btn-sm me-2"
                  @click="handleSetAll(tabProps, true)"
                >
                  <i class="bi bi-check-all"></i>
                  Select All
                  {{ tabProps.filterString ? 'Filtered' : '' }}
                </button>
                <button
                  type="button"
                  class="btn btn-white btn-outline-black btn-sm me-2"
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
                <h6 class="me-2 ">Unselected</h6>
                <!-- <caption class="ms-4 mt-0"> -->
                <span class="border-start-2 fst-italic">
                  >  <i class="bi bi-box-arrow-in-right" /> Suggested Tracker
                </span>
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
                    <!-- @input="tabProps.trackerSelections.set(tracker, !tabProps.trackerSelections.get(tracker))" -->
                    <span
                      v-if="tracker.selected"
                      title="Suggested Tracker"
                      class="ps-1"
                    >
                      <i class="bi bi-box-arrow-in-right">
                        <span class="visually-hidden"> Suggested Tracker </span>
                      </i>
                    </span>
                    {{ `${tracker.ps_update_stream} (${tracker.ps_component})` }}
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
                    {{ `${tracker.ps_update_stream} (${tracker.ps_component})` }}
                  </label>
                </div>
              </div>
            </div>
            <button
              v-osim-loading.grow="tabProps.isFilingTrackers"
              type="button"
              class="btn btn-sm btn-black text-white osim-file-trackers mt-3"
              :disabled="!trackersToFile.length || isFilingTrackers"
              @click="handleFileTrackers"
            >
              <i v-if="isFilingTrackers" class="bi bi-archive"></i>
              File Selected Trackers
            </button>
          </div>
        </template>
      </TabsDynamic>
    </div>
  </div>

</template>

<style lang="scss" scoped>
@import '@/scss/bootstrap-overrides';

.osim-tracker-list {
  display: flex;
  flex-flow: column;
  max-height: 30vh;
  overflow-y: auto;
  background-color: #fff;
}

.osim-trackers-filing {
  overflow: hidden;
}

.osim-affect-trackers-container {
  border-left: 5px solid $blue;
  background-color: #edf6ff;
  border-radius: 5px;

  .btn-white:not(:hover) {
    background-color: white;
    color: black;
  }
}


.osim-tracker-selection-disabled {
  text-decoration: strike-through;
  font-style: italic;
  color: gray;
}

input[type="checkbox"].osim-tracker {
  margin-bottom: .5rem;
}


button.osim-file-trackers:disabled {
  cursor: not-allowed;
  opacity: .3;
}
</style>
