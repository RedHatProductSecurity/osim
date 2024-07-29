<script setup lang="ts">
import { type ZodAffectType } from '@/types/zodAffect';
import { useTrackers } from '@/composables/useTrackers';
import { computed, toRef } from 'vue';

const props = defineProps<{
  flawId: string;
  affects: ZodAffectType[];
}>();

const affects = toRef(props, 'affects');

const {
  trackerSelections,
  trackersToFile,
  fileTrackers,
  // setAllTrackerSelections,
  toggleTrackerSelections,
  unselectedStreams,
  selectedStreams,
  filterString,
  // alreadyFiledTrackers,
  isFilingTrackers,
  untrackableAffects,
  isLoadingTrackers,
} = useTrackers(props.flawId, affects);

const unselectedAffectStreams = computed(() => {
  const referenceAffect = props.affects;
  return unselectedStreams.value.filter((tracker) => {
    return referenceAffect.some((refAffect) => {
      return refAffect.ps_component === tracker.ps_component
      && refAffect.ps_module === tracker.ps_module;
    }
    );
  });
});

const selectedAffectStreams = computed(() => {
  const referenceAffect = props.affects;
  return selectedStreams.value.filter((tracker) => {
    return referenceAffect.some((refAffect) => {
      return refAffect.ps_component === tracker.ps_component
      && refAffect.ps_module === tracker.ps_module;
    }
    );
  });
});

// const affectStreams = computed(() => {
//   return [...unselectedAffectStreams.value, ...selectedAffectStreams.value];
// });

// const selectedStreams = computed(
//   (): UpdateStream[] => sortedStreams.value.filter((tracker) => trackerSelections.value.get(tracker))
// );

const emit = defineEmits<{
  'affects-trackers:hide': [];
  'affects-trackers:refresh': [];
}>();

function handleFileTrackers() {
  fileTrackers().then(() => {
    emit('affects-trackers:refresh');
  });
}
</script>

<template>
  <div class="container-fluid py-1 px-3">
    <div class="mb-2 d-flex">
      <!-- <div v-if="alreadyFiledTrackers && alreadyFiledTrackers.length > 0" class="osim-tracker-list mb-2 col">
        <h5>Filed</h5>
        <label
          v-for="(tracker, index) in alreadyFiledTrackers"
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
      </div> -->
    </div>
    <div>
      <div class="ms-2">
        <div class="row">
          <input
            v-model="filterString"
            type="text"
            class="form-control form-control-sm mb-2"
            style="width: 35%;"
            placeholder="Filter by stream or component name"
          />
          <div class="col mb-2">
            <button
              type="button"
              :disabled="isLoadingTrackers || unselectedAffectStreams.length === 0"
              class="btn btn-white btn-outline-black btn-sm me-2"
              @click="toggleTrackerSelections(unselectedAffectStreams)"
            >
              <i class="bi bi-check-all" />
              Select All
              {{ filterString ? 'Filtered' : '' }}
            </button>
            <button
              type="button"
              :disabled="isLoadingTrackers || selectedAffectStreams.length === 0"
              class="btn btn-white btn-outline-black btn-sm me-2"
              @click="toggleTrackerSelections(selectedAffectStreams)"
            >
              <i class="bi bi-x-square" />
              Deselect All
              {{ filterString ? 'Filtered' : '' }}
            </button>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col">
            <h5 class="me-2 d-inline-block fs-5">Unselected</h5>
            <caption class="ms-2">
              <span class="fst-italic">
                (<i class="bi bi-box-arrow-in-right" /> indicates a Suggested Tracker)
              </span>
            </caption>
          </div>
          <div class="col">
            <h6 class="fs-5">Selected</h6>
          </div>
        </div>
        <div class="row">
          <div v-if="isLoadingTrackers" class="m-1">
            <span
              class="spinner-border spinner-border-sm"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <span> Loading trackers&hellip; </span>
          </div>
          <div class="col-6 pt-1">
            <div class="osim-tracker-list mb-2">
              <div v-if="unselectedAffectStreams.length === 0 && !isLoadingTrackers" class="ms-1">
                <span> No unselected trackers&hellip; </span>
              </div>
              <label
                v-for="(tracker, index) in unselectedAffectStreams"
                :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
              >
                <input
                  :checked="trackerSelections.get(tracker)"
                  type="checkbox"
                  class="osim-tracker form-check-input ms-2"
                  @input="trackerSelections.set(tracker, !trackerSelections.get(tracker))"
                />
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
              <div v-if="selectedAffectStreams.length === 0 && !isLoadingTrackers" class="ms-1">
                <span> No selected trackers&hellip; </span>
              </div>
              <label
                v-for="(tracker, index) in selectedAffectStreams"
                :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
              >
                <input
                  :checked="trackerSelections.get(tracker)"
                  type="checkbox"
                  class="osim-tracker form-check-input"
                  @input="trackerSelections.set(tracker, !trackerSelections.get(tracker))"
                />
                {{ `${tracker.ps_update_stream} (${tracker.ps_component})` }}
              </label>
            </div>
          </div>
        </div>
        <button
          v-osim-loading.grow="isFilingTrackers"
          type="button"
          class="btn btn-sm btn-black text-white osim-file-trackers mt-3 float-end"
          :disabled="!trackersToFile.length || isFilingTrackers || isLoadingTrackers"
          @click="handleFileTrackers"
        >
          <i v-if="!isFilingTrackers" class="bi bi-archive"></i>
          File Selected Trackers
        </button>
      </div>
      <div v-if="untrackableAffects && untrackableAffects.length > 0" class="col">
        <div class="alert alert-danger mt-2">
          <h5>Untrackable Affects</h5>
          <p>
            These affects do not have available trackers. This may indicate an issue with product defintions.
            Please contact the OSIDB/OSIM team for assistance.
          </p>
          <div class="osim-tracker-list p-1" style="border-radius: 5px;">
            <span v-for="affect in untrackableAffects" :key="`${affect.ps_module}-${affect.ps_component}`">
              <span class="ps-2 text-danger">
                <i class="bi bi-exclamation-triangle"></i>
                {{ affect.ps_module }}/{{ affect.ps_component }}
              </span>
            </span>
          </div>
        </div>
      </div>
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

  label {
    user-select: none;
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
