<script setup lang="ts">
import { type ZodAffectType } from '@/types/zodAffect';
import { useTrackers } from '@/composables/useTrackers';

const props = defineProps<{
  flawId: string;
  theAffects: ZodAffectType[];
}>();

const {
  trackerSelections,
  trackersToFile,
  fileTrackers,
  setAll,
  unselectedStreams,
  selectedStreams,
  filterString,
  alreadyFiledTrackers,
} = useTrackers(props.flawId, props.theAffects);
const emit = defineEmits<{
  'affects-trackers:hide': [];
}>();
</script>

<template>
  <div class="mt-3">
    <h4 class="mb-2">
      Affected Offerings Trackers
      <div>
        <input
          v-model="filterString"
          type="text"
          class="form-control form-control-sm"
          placeholder="Filter by stream or component name"
        />
      </div>
      <button
        type="button"
        class="btn btn-white btn-outline-black btn-sm me-2"
        @click="setAll(true)"
      >
        <i class="bi bi-check-all"></i>
        Select All
      </button>
      <button
        type="button"
        class="btn btn-white btn-outline-black btn-sm me-2"
        @click="setAll(false)"
      >
        <i class="bi bi-recycle"></i>
        Deselect All
      </button>
      <button
        type="button"
        class="btn btn-white btn-outline-black btn-sm"
        @click="emit('affects-trackers:hide')"
      >
        <i class="bi bi-eye-slash-fill"></i>
        Hide Manager
      </button>
    </h4>
    <div class="osim-trackers-filing mb-2">
      <div v-if="alreadyFiledTrackers.length" class="osim-tracker-selections mb-2">
        <h5>Filed Trackers</h5>
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
      <div class="row mb-2">
        <h5>Unfiled Trackers</h5>

      </div>
      <div class="ms-3">
        <div class="row">
          <div class="col-6">
            <h5 class="me-2 d-inline-block">Unselected</h5>
            <caption class="ms-4 mt-0">
              (<span class="fst-italic">
                <i class="bi bi-box-arrow-in-right" /> indicates a Suggested Tracker
              </span>)
            </caption>
          </div>
          <div class="col-6">
            <h5>Selected</h5>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="osim-tracker-selections mb-2">
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

          <div class="col-6">
            <div class="osim-tracker-selections mb-2">
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
          type="button"
          class="button btn btn-sm btn-black text-white osim-file-trackers mt-3"
          :disabled="!trackersToFile.length"
          @click="fileTrackers"
        >
          <i class="bi bi-archive"></i>
          File Selected Trackers
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.osim-tracker-selections {
  display: flex;
  flex-flow: column wrap;
}

.osim-trackers-filing {
  overflow: hidden;

  .col-6:has(.osim-tracker-selections) {
    height: 50vh;
    overflow-y: auto;
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
