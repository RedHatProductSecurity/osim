<script setup lang="ts">
import { StateEnum } from '@/generated-client';
import type { ZodFlawType } from '@/types';
import { FlawLabelTypeEnum } from '@/types/zodFlaw';
import { watchedRef } from '@/utils/helpers';

import FlawLabelsContributor from './FlawLabelsContributor.vue';

const { contextLabels, initalLabel } = defineProps<{
  contextLabels?: string[];
  initalLabel?: NonNullable<ZodFlawType['labels']>[number];
}>();

const emit = defineEmits<{
  cancel: [];
  save: [label: Omit<NonNullable<ZodFlawType['labels']>[number], 'uuid'>];
}>();

const [labelState, hasStateChanged] = watchedRef<StateEnum>(initalLabel?.state ?? StateEnum.New);
const [labelName, hasNameChanged] = watchedRef(initalLabel?.label ?? '');
const [labelContributor, hasContributorChanged] = watchedRef(initalLabel?.contributor ?? '');

const emitSave = () => {
  // if nothing changed, do not emit save
  if (
    !hasStateChanged.value
    && !hasNameChanged.value
    && !hasContributorChanged.value
  ) {
    return emit('cancel');
  }

  // if label name is empty, do nothing
  if (!labelName.value) {
    return;
  }

  emit('save', {
    ...initalLabel,
    state: labelState.value,
    label: labelName.value,
    contributor: labelContributor.value,
    relevant: initalLabel?.relevant ?? true,
    type: initalLabel?.type ?? FlawLabelTypeEnum.CONTEXT_BASED,
  });
};
</script>

<template>
  <td>
    <select v-model="labelState" class="form-select">
      <option
        v-for="state in StateEnum"
        :key="state"
        :value="state"
      >{{ state }}</option>
    </select>
  </td>
  <td
    :class="{
      'fw-bold': labelState === 'REQ',
      'text-decoration-line-through': !initalLabel?.relevant,
    }"
  >
    <template v-if="initalLabel?.type !== FlawLabelTypeEnum.PRODUCT_FAMILY">
      <select
        v-model="labelName"
        class="form-select"
        required
      >
        <option
          v-for="label in contextLabels"
          :key="label"
          :value="label"
        >{{ label }}</option>
      </select>
    </template>
    <template v-else>
      {{ initalLabel?.label }}
    </template>
  </td>
  <td>
    <FlawLabelsContributor v-model="labelContributor" />
  </td>
  <td>
    <div class="actions">
      <button
        type="button"
        class="btn btn-sm btn-dark"
        title="Save"
        @click="emitSave"
      >
        <i class="bi bi-check2" />
      </button>
      <button
        type="button"
        class="btn btn-sm btn-dark"
        title="Cancel"
        @click="emit('cancel')"
      >
        <i class="bi bi-x" />
      </button>
    </div>
  </td>
</template>

<style scoped lang="scss">
input,
select {
  padding: 0.15rem 0.5rem;
}
</style>
