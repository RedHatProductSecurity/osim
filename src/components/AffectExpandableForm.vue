<script setup lang="ts">
import { computed, ref, toRef } from 'vue';

import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';
import AffectedOfferingForm from './AffectedOfferingForm.vue';
import { type ZodAffectType } from '@/types/zodFlaw';
import { useAffectTracker } from '@/composables/useAffectTracker';

import type { TrackersPost } from '@/services/TrackerService';

const props = defineProps<{
  error?: string;
  isExpanded: boolean;
  componentName: string;
  affectedComponent: ZodAffectType;
}>();

const isExpanded = toRef(props, 'isExpanded');

const modelValue = defineModel<ZodAffectType>({ default: null });

const emit = defineEmits<{
  'file-tracker': [value: object];
  'update:modelValue': [value: object];
  remove: [value: ZodAffectType];
  recover: [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const flawId = computed(() => modelValue.value.flaw);

const { getTrackers, moduleComponentStreams, isNotApplicable, postTracker } = useAffectTracker(
  flawId.value as string,
  modelValue.value.ps_module,
  modelValue.value.ps_component,
);

const updateStreamNames = computed(() =>
  moduleComponentStreams.value.map(({ ps_update_stream }: any) => ps_update_stream),
);

// const chosenUpdateStream = ref('');

function handleTrackAffect(stream: string) {
  postTracker({
    ps_update_stream: stream,
    // resolution: modelValue.value.resolution || '',
    updated_dt: modelValue.value.updated_dt || '',
    affects: [modelValue.value.uuid],
    embargoed: modelValue.value.embargoed,
  } as TrackersPost);
}

function componentLabel(affectedComponent: ZodAffectType) {
  return affectedComponent.uuid
    ? `(${affectedComponent.trackers?.length || 0} trackers)`
    : '(unsaved in OSIDB)';
}
</script>

<template>
  <LabelCollapsable :is-expanded="isExpanded" class="mt-2">
    <template #label>
      <label class="ms-2 form-label">
        {{ `${componentName} ${componentLabel(affectedComponent)}` }}
      </label>
    </template>
    <template #buttons>
      <div class="btn-group ms-2" role="group" aria-label="Tracker Actions">
        <button
          v-if="updateStreamNames.length === 0"
          type="button"
          class="btn btn-white btn-outline-black btn-sm ms-2"
          :disabled="!flawId || isNotApplicable"
          @click.prevent="getTrackers"
        >
          {{ isNotApplicable ? 'No Product Streams Apply' : 'File Tracker' }}
        </button>
        <div v-else class="dropdown">
          <button
            class="btn btn-white btn-outline-black btn-sm dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            Trackers
          </button>
          <div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
            <a
              v-for="stream in updateStreamNames"
              :key="stream"
              class="dropdown-item"
              href="#"
              @click.prevent="handleTrackAffect(stream)"
            >{{ stream }}</a>
          </div>
        </div>
        <button type="button" class="btn btn-white btn-outline-black btn-sm">
          <!-- TODO: Advance status through workflow with this button -->
          🚧 Status
        </button>
        <button
          type="button"
          class="btn btn-white btn-outline-black btn-sm"
          @click.prevent="emit('remove', modelValue)"
        >
          <i class="bi bi-trash" />
        </button>
      </div>
    </template>
    <AffectedOfferingForm v-model="modelValue" />
  </LabelCollapsable>
</template>

<style scoped lang="scss">
.osim-affected-offerings {
  padding-left: 0.75rem;

  table {
    table-layout: fixed;
  }

  th {
    border-bottom: none;
  }

  td {
    word-wrap: break-word;
  }

  .osim-tracker-update-streams :deep(.col-3),
  .osim-tracker-update-streams :deep(.col-9) {
    width: 50%;
  }
}
</style>
