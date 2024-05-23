<script setup lang="ts">
import { type ZodAffectType } from '@/types/zodAffect';
import { useTrackers } from '@/composables/useTrackers';

const props = defineProps<{
  flawId: string;
  theAffects: ZodAffectType[];
}>();

const {
  availableUpdateStreams,
  trackerSelections,
  trackersToFile,
  fileTrackers,
  setAll
} = useTrackers(props.flawId, props.theAffects);

const emit = defineEmits<{
  'affects-trackers:hide': [];
}>();

</script>

<template>
  <div class="mt-3">
    <h4 class="mb-2">
      Affected Offerings Trackers
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
    <div class="osim-trackers-filing">

      <div class="osim-tracker-selections mb-2">
        <label
          v-for="(tracker, index) in availableUpdateStreams"
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
      <button
        type="button"
        class="button btn btn-sm btn-black text-white osim-file-trackers"
        :disabled="!trackersToFile.length"
        @click="fileTrackers"
      >
        <i class="bi bi-archive"></i>
        File Selected Trackers
      </button>
    </div>
  </div>

</template>

<style lang="scss" scoped>
.osim-tracker-selections {
  display: flex;
  flex-flow: column wrap;
}

.osim-trackers-filing {
  padding: 1.5rem;
  padding-top: 0;
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
