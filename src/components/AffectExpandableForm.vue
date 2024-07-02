
<script setup lang="ts">
import { computed, toRef } from 'vue';

import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import { type ZodAffectType } from '@/types/zodAffect';
import { type UpdateStream } from '@/composables/useTrackers';

const props = defineProps<{
  updateStreams: UpdateStream[];
  error: Record<string, any> | null;
  isExpanded: boolean;
  affect: ZodAffectType;
}>();

const isExpanded = toRef(props, 'isExpanded');

const modelValue = defineModel<ZodAffectType>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'update:modelValue': [value: object];
  'affect:remove': [value: ZodAffectType];
  recover: [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const isAffectNew = computed (() => !modelValue.value?.uuid);
const trackersCount = computed(() => `${modelValue.value?.trackers?.length || 0} trackers`);

const affectednessLabel = computed(() => {
  const affectedness: string = props.affect.affectedness || '';
  const affectednessValue = {
    [affectedness]: affectedness,
    'NEW': 'New',
    'AFFECTED': 'Affected',
    'NOTAFFECTED': 'Not Affected',
  }[affectedness];
  return affectednessValue && `Affectedness: ${affectednessValue}` || '';
});

const resolutionLabel = computed(() => {
  const resolution: string = props.affect.resolution || '';
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
  <LabelCollapsible :isExpanded="isExpanded" class="mt-2 mb-0" :class="{'alert alert-warning': isAffectNew}">
    <template #label>
      <label class="mx-2 form-label">
        {{ `${affect.ps_component}` }}
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
      <!-- TODO: consider readding inidividual tracker filing? -->
      <button
        type="button"
        class="btn btn-white btn-outline-black btn-sm"
        @click="emit('affect:remove', modelValue as ZodAffectType)"
      >
        <i class="bi bi-trash" />
      </button>
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
