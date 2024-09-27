<script setup lang="ts">
import { computed, ref, toRefs } from 'vue';

import FlawAffectsTableRow from '@/components/FlawAffects/FlawAffectsTableRow.vue';

import type { ZodAffectType } from '@/types';
import { isAffectIn } from '@/utils/helpers';

import { displayModes } from './flawAffectConstants';
import FlawAffectsTableHead from './FlawAffectsTableHead.vue';

const props = defineProps<{
  affectsBeingEdited: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: null | Record<string, any>;
  modifiedAffects: ZodAffectType[];
  selectedAffects: ZodAffectType[];
  totalPages: number;
}>();
const affects = defineModel<ZodAffectType[]>('affects', { default: [] });
const emit = defineEmits<{
  'affect:cancel': [value: ZodAffectType];
  'affect:commit': [value: ZodAffectType];
  'affect:edit': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'affect:remove': [value: ZodAffectType];
  'affect:revert': [value: ZodAffectType];
  'affect:toggle-selection': [value: ZodAffectType];
  'affect:track': [value: ZodAffectType];
  'affects:display-mode': [value: displayModes];
}>();

const { affectsBeingEdited, modifiedAffects, selectedAffects } = toRefs(props);

const selectedModules = ref<string[]>([]);

// const savedAffects = clone(affects.value) as ZodAffectType[];

const newAffects = computed(() => affects.value?.filter(affect => !affect.uuid) ?? []);

function isRemoved(affect: ZodAffectType) {
  return props.affectsToDelete.includes(affect);
}

function isModified(affect: ZodAffectType) {
  return modifiedAffects.value.includes(affect);
}

function isNewAffect(affect: ZodAffectType) {
  return newAffects.value.includes(affect);
}

function isBeingEdited(affect: ZodAffectType) {
  return isAffectIn(affect, affectsBeingEdited.value);
}
</script>

<template>
  <table class="table align-middle table-striped mt-1" :class="{'mb-0': totalPages === 0}">
    <FlawAffectsTableHead
      v-model:affects="affects"
      :selectedModules="selectedModules"
      :affectsToDelete="affectsToDelete"
      :affectsBeingEdited="affectsBeingEdited"
    />
    <tbody>
      <template v-for="(affect, affectIndex) in affects" :key="affectIndex">
        <FlawAffectsTableRow
          :affect="affect"
          :error="props.error"
          :isRemoved="isRemoved(affect)"
          :isModified="isModified(affect)"
          :isNew="isNewAffect(affect)"
          :isBeingEdited="isBeingEdited(affect)"
          :isSelected="selectedAffects.includes(affect)"
          :isLast="affectIndex === affects.length - 1"
          @affect:edit="emit('affect:edit', affect)"
          @affect:cancel="emit('affect:cancel', affect)"
          @affect:commit="emit('affect:commit', affect)"
          @affect:recover="emit('affect:recover', affect)"
          @affect:revert="emit('affect:revert', affect)"
          @affect:remove="emit('affect:remove', affect)"
          @affect:toggle-selection="emit('affect:toggle-selection', affect)"
          @affect:track="emit('affect:track', affect)"
        />
      </template>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

table {
  border-collapse: separate;
}
</style>
