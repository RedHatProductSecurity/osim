<script setup lang="ts">
import { type ZodAffectType } from '@/types/zodAffect';
import { useTrackers } from '@/composables/useTrackers';
import { computed, toRef } from 'vue';

const props = defineProps<{
  flawId: string;
  affects: ZodAffectType[];
  mode: 'modal' | 'embedded';
}>();

const emit = defineEmits<{
  'affects-trackers:refresh': [];
}>();
const {

  trackerSelections,
  trackersToFile,
  fileTrackers,
  toggleTrackerSelections,
  unselectedStreams,
  selectedStreams,
  filterString,
  isFilingTrackers,
  alreadyFiledTrackers,
  untrackableAffects,
  isLoadingTrackers,
} = useTrackers(props.flawId, toRef(props, 'affects'));

const availableAffectStreams = computed(() => {
  const referenceAffect = props.affects;
  return unselectedStreams?.value.filter((tracker) => {
    return referenceAffect.some((refAffect) => {
      return refAffect.ps_component === tracker.ps_component
      && refAffect.ps_module === tracker.ps_module;
    }
    );
  });
});

const selectedAffectStreams = computed(() => {
  const referenceAffect = props.affects;
  return selectedStreams?.value.filter((tracker) => {
    return referenceAffect.some((refAffect) => {
      return refAffect.ps_component === tracker.ps_component
      && refAffect.ps_module === tracker.ps_module;
    }
    );
  });
});

function handleFileTrackers() {
  fileTrackers().then(() => {
    emit('affects-trackers:refresh');
  });
}
</script>

<template>
  <div class="trackers-manager py-3 px-4" :class="{'embedded': mode === 'embedded'}">
    <h4 v-if="mode === 'embedded'" class="mb-2 d-flex">
      Trackers Manager
    </h4>
    <div class="trackers-search-bar gap-2">
      <input
        v-model="filterString"
        type="text"
        class="form-control form-control-sm"
        placeholder="Filter by stream or component name"
      />
      <button
        type="button"
        :disabled="isLoadingTrackers || availableAffectStreams?.length === 0"
        class="btn btn-sm btn-black"
        @click="toggleTrackerSelections(availableAffectStreams)"
      >
        <i class="bi bi-check-all" />
        Select All
        {{ filterString ? 'Filtered' : '' }}
      </button>
      <button
        type="button"
        :disabled="isLoadingTrackers || selectedAffectStreams?.length === 0"
        class="btn btn-sm btn-black"
        @click="toggleTrackerSelections(selectedAffectStreams)"
      >
        <i class="bi bi-x-square" />
        Deselect All
        {{ filterString ? 'Filtered' : '' }}
      </button>
    </div>
    <div class="row mt-3">
      <div class="col">
        <h5 class="d-inline-block fs-5">Available Trackers</h5>
        <caption>
          <span class="fst-italic">
            (<i class="bi bi-box-arrow-in-right" /> indicates a Suggested Tracker)
          </span>
        </caption>
      </div>
      <div class="col">
        <h6 class="fs-5">Selected To File</h6>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="mb-2">
          <div v-if="isLoadingTrackers" class="ms-2 mb-1">
            <span
              class="spinner-border spinner-border-sm"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <span>Loading trackers&hellip;</span>
          </div>
          <div v-if="availableAffectStreams?.length === 0 && !isLoadingTrackers" class="ms-2">
            <span> No available trackers&hellip; </span>
          </div>
          <div v-else-if="!isLoadingTrackers" class="osim-tracker-list">
            <label
              v-for="(tracker, index) in availableAffectStreams"
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
      </div>
      <div class="col">
        <div class="mb-2">
          <div v-if="isLoadingTrackers" class="ms-2 mb-1">
            <span
              class="spinner-border spinner-border-sm"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <span>Loading trackers&hellip;</span>
          </div>
          <div v-if="selectedAffectStreams?.length === 0 && !isLoadingTrackers" class="ms-2">
            <span> No trackers selected&hellip; </span>
          </div>
          <div v-else-if="!isLoadingTrackers" class="osim-tracker-list">
            <label
              v-for="(tracker, index) in selectedAffectStreams"
              :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
            >
              <input
                :checked="trackerSelections.get(tracker)"
                type="checkbox"
                class="osim-tracker form-check-input ms-2"
                @input="trackerSelections.set(tracker, !trackerSelections.get(tracker))"
              />
              {{ `${tracker.ps_update_stream} (${tracker.ps_component})` }}
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="row mt-4">
      <div class="col mb-2">
        <h5>Already Filed</h5>
        <div v-if="isLoadingTrackers" class="ms-2 mb-1">
          <span
            class="spinner-border spinner-border-sm"
            role="status"
          >
            <span class="visually-hidden">Loading...</span>
          </span>
          <span>Loading trackers&hellip;</span>
        </div>
        <div v-if="alreadyFiledTrackers?.length === 0 && !isLoadingTrackers" class="ms-2">
          <span> No filed trackers&hellip; </span>
        </div>
        <div v-else-if="!isLoadingTrackers" class="osim-tracker-list">
          <label
            v-for="(tracker, index) in alreadyFiledTrackers"
            :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
          >
            <input
              checked
              disabled
              type="checkbox"
              class="osim-tracker form-check-input ms-2"
            />
            {{ `${tracker.ps_update_stream} (${tracker.ps_component})` }}
          </label>
        </div>
      </div>
      <div class="col">
        <div>
          <h5>Untrackable Affects
            <i
              class="bi bi-exclamation-circle text-danger"
              :title="'These affects do not have available trackers.'
                +' This may indicate an issue with product defintions.'
                +' Please contact the OSIDB/OSIM team for assistance.'"
            />
          </h5>
          <div v-if="isLoadingTrackers" class="ms-2 mb-1">
            <span
              class="spinner-border spinner-border-sm"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <span>Loading trackers&hellip;</span>
          </div>
          <div v-if="untrackableAffects?.length === 0 && !isLoadingTrackers" class="ms-2">
            <span> No untrackable affects&hellip; </span>
          </div>
          <div
            v-if="!isLoadingTrackers && untrackableAffects?.length > 0"
            class="osim-tracker-list"
          >
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
    <button
      v-osim-loading.grow="isFilingTrackers"
      type="button"
      class="btn btn-sm btn-black osim-file-trackers mt-4"
      :disabled="!trackersToFile.length || isFilingTrackers || isLoadingTrackers"
      @click="handleFileTrackers"
    >
      <i v-if="!isFilingTrackers" class="bi bi-archive"></i>
      File Selected Trackers
    </button>
  </div>
</template>

<style lang="scss" scoped>

.trackers-manager {
  display: flex;
  flex-direction: column;

  &.embedded {
    border-top: 0 !important;
    border: 10px solid #212529;
    border-bottom-right-radius: .375rem;
    border-bottom-left-radius: .375rem;
  }

  .trackers-search-bar {
    display: flex;

    input {
      width: 65ch;
    }
  }
}

.osim-tracker-list {
  display: flex;
  flex-flow: column;
  max-height: 20vh;
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

button.osim-file-trackers:disabled {
  cursor: not-allowed;
  opacity: .3;
}

.btn-black {
  background-color: #212529;
  transition: background-color .25s, outline-color .25s;

  &:hover {
    background-color: #212529;
  }

  &:disabled {
    background-color: white;
    color: black;
  }
}
</style>
