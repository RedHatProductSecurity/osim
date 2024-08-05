<script setup lang="ts">
import { type ZodAffectType } from '@/types/zodAffect';
import { useTrackers } from '@/composables/useTrackers';
import { toRef } from 'vue';

const props = defineProps<{
  flawId: string;
  theAffects: ZodAffectType[];
}>();

const theAffects = toRef(props, 'theAffects');

const {
  trackerSelections,
  trackersToFile,
  fileTrackers,
  setAllTrackerSelections,
  unselectedStreams,
  selectedStreams,
  filterString,
  alreadyFiledTrackers,
  isFilingTrackers,
  untrackableAffects,
} = useTrackers(props.flawId, theAffects);

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
      <div v-if="alreadyFiledTrackers?.length" class="osim-tracker-list mb-2">
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
      </div>
      <div v-if="untrackableAffects?.length > 0">
        <div class="ms-3 alert alert-danger w-50 border-0">
          <details>
            <summary>
              <h5 class="d-inline-block">Untrackable Affects</h5>
            </summary>
            <p>
              These affects do not have available trackers. This may indicate an issue with product defintions.
              Please contact the OSIDB/OSIM team for assistance.
            </p>
            <div class="osim-tracker-list">
              <span v-for="affect in untrackableAffects" :key="`${affect.ps_module}-${affect.ps_component}`">
                <p class="ps-1 text-danger my-0">
                  <i class="bi bi-exclamation-triangle"></i>
                  {{ affect.ps_module }}/{{ affect.ps_component }}
                </p>
              </span>
            </div>
          </details>
        </div>
      </div>
      <h5>
        Unfiled
      </h5>
      <div class="ms-3 mt-2">
        <div class="row mb-2">
          <div class="col">
            <input
              v-model="filterString"
              type="text"
              class="form-control form-control-sm d-inline-block w-50"
              placeholder="Filter by stream or component name"
            />
          </div>
        </div>
        <div class="row">
          <div class="col mb-2">
            <button
              type="button"
              class="btn btn-white btn-outline-black btn-sm me-2"
              @click="setAllTrackerSelections(true)"
            >
              <i class="bi bi-check-all"></i>
              Select All
              {{ filterString ? 'Filtered' : '' }}
            </button>
            <button
              type="button"
              class="btn btn-white btn-outline-black btn-sm me-2"
              @click="setAllTrackerSelections(false)"
            >
              <i class="bi bi-eraser"></i>
              Deselect All
              {{ filterString ? 'Filtered' : '' }}
            </button>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <h6 class="me-2 d-inline-block">Unselected</h6>
            <caption class="ms-4 mt-0">
              (<span class="fst-italic">
                <i class="bi bi-box-arrow-in-right" /> indicates a Suggested Tracker
              </span>)
            </caption>
          </div>
          <div class="col-6">
            <h6>Selected</h6>
          </div>
        </div>
        <div class="row">
          <div class="col-6 pt-1">
            <div class="osim-tracker-list mb-2">
              <label
                v-for="(tracker, index) in unselectedStreams"
                :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
              >
                <input
                  :checked="trackerSelections.get(tracker)"
                  type="checkbox"
                  class="osim-tracker form-check-input"
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
              <label
                v-for="(tracker, index) in selectedStreams"
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
          class="btn btn-sm btn-black text-white osim-file-trackers mt-3"
          :disabled="!trackersToFile?.length || isFilingTrackers"
          @click="handleFileTrackers"
        >
          <i v-if="!isFilingTrackers" class="bi bi-archive"></i>
          File Selected Trackers
        </button>
      </div>
    </div>
  </div>

</template>

<style lang="scss" scoped>
@import '@/scss/bootstrap-overrides';

details:not([open]) h5 {
  margin-bottom: 0;
}

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
