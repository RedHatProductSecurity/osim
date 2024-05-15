
<script setup lang="ts">
import { computed, toRef } from 'vue';

import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import AffectedOfferingForm from './AffectedOfferingForm.vue';
import { type ZodAffectType } from '@/types/zodFlaw';
import { useAffectTracker } from '@/composables/useAffectTracker';

import type { TrackersPost } from '@/services/TrackerService';

const props = defineProps<{
  error: Record<string, any> | null;
  isExpanded: boolean;
  componentName: string;
  affectedComponent: ZodAffectType;
}>();


const isExpanded = toRef(props, 'isExpanded');

const modelValue = defineModel<ZodAffectType>({ default: null });

const emit = defineEmits<{
  'file-tracker': [value: object];
  'update:modelValue': [value: object];
  'affect:remove': [value: ZodAffectType];
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

const isAffectNew = computed (() => !modelValue.value.uuid);

const trackersCount = computed(
  () => `${modelValue.value.trackers?.length || 0} trackers`
);

const affectednessLabel = computed(() => {
  const affectedness: string = props.affectedComponent.affectedness || '';
  const affectednessValue = {
    [affectedness]: affectedness,
    'NEW': 'New',
    'AFFECTED': 'Affected',
    'NOTAFFECTED': 'Not Affected',
  }[affectedness];
  return affectednessValue && `Affectedness: ${affectednessValue}` || '';
});

const resolutionLabel = computed(() => {
  const resolution: string = props.affectedComponent.resolution || '';
  const resolutionValue = {
    [resolution]: resolution,
    'DELEGATED': 'Delegated',
    'WONTFIX': 'Won\'t Fix',
    'OOSS': 'OOSS',
  }[resolution];
  return resolutionValue && `Resolution: ${resolutionValue}` || '';
});

</script>

<template>
  <LabelCollapsible :isExpanded="isExpanded" class="mt-2" :class="{'alert alert-warning': isAffectNew}">
    <template #label>
      <label class="mx-2 form-label">
        {{ `${componentName}` }}
      </label>
      <span v-if="isAffectNew" class="badge bg-warning text-black">
        Not Saved in OSIDB
      </span>
      <span v-else class="badge bg-light-info text-dark border border-info">
        {{ `${trackersCount}` }}
      </span>
      <span v-if="affectednessLabel" class="badge bg-light-info text-dark mx-1 affectedness-label border border-info">
        {{ affectednessLabel }}
      </span>
      <span v-if="resolutionLabel" class="badge bg-light-info text-dark mx-1 resolution-label border border-info">
        {{ resolutionLabel }}
      </span>
    </template>
    <template #buttons>
      <div class="btn-group" role="group" aria-label="Tracker Actions">
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
        <button
          type="button"
          class="btn btn-white btn-outline-black btn-sm"
          @click="emit('affect:remove', modelValue)"
        >
          <i class="bi bi-trash" />
        </button>
      </div>
    </template>
    <AffectedOfferingForm v-model="modelValue" :error="error" />
  </LabelCollapsible>
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
