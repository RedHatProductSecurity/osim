<script setup lang="ts">
import { computed } from 'vue';

import FlawAffectsTableRow from '@/components/FlawAffects/FlawAffectsTableRow.vue';

import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';

import type { ZodAffectType } from '@/types';

import { displayModes } from './flawAffectConstants';
import FlawAffectsTableHead from './FlawAffectsTableHead.vue';

defineProps<{
  errors: null | Record<string, any>;
  totalPages: number;
}>();

const affects = defineModel<ZodAffectType[]>('affects', { default: [] });

const emit = defineEmits<{
  'affect:recover': [value: ZodAffectType];
  'affect:remove': [value: ZodAffectType];
  'affect:toggle-selection': [value: ZodAffectType];
  'affect:track': [value: ZodAffectType];
  'affect:updateCvss': [affect: ZodAffectType, newVector: string, newScore: null | number, cvssScoreIndex: number];
  'affects:display-mode': [value: displayModes];
}>();

const { isAffectBeingRemoved, modifiedAffects } = useFlawAffectsModel();

const newAffects = computed(() => affects.value?.filter(affect => !affect.uuid) ?? []);

function isModified(affect: ZodAffectType) {
  return modifiedAffects.value.includes(affect);
}

function isNewAffect(affect: ZodAffectType) {
  return newAffects.value.includes(affect);
}
</script>

<template>
  <table class="table align-middle table-striped mt-1" :class="{'mb-0': totalPages === 0}">
    <FlawAffectsTableHead />
    <tbody>
      <template v-for="(affect, affectIndex) in affects" :key="affectIndex">
        <FlawAffectsTableRow
          v-model:affect="affects[affectIndex]"
          :error="errors?.[affectIndex] ?? null"
          :isRemoved="isAffectBeingRemoved(affect)"
          :isModified="isModified(affect)"
          :isNew="isNewAffect(affect)"
          :isLast="affectIndex === affects.length - 1"
          @affect:recover="emit('affect:recover', affect)"
          @affect:remove="emit('affect:remove', affect)"
          @affect:toggle-selection="emit('affect:toggle-selection', affect)"
          @affect:track="emit('affect:track', affect)"
          @affect:updateCvss="(affect, newVector, newScore, cvssScoreIndex) => emit(
            'affect:updateCvss',
            affect,
            newVector,
            newScore,
            cvssScoreIndex
          )"
        />
      </template>
    </tbody>
  </table>
</template>

<style scoped lang="scss">
@import '@/scss/bootstrap-overrides';

table {
  border-collapse: separate;

  &:deep(td) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    span,
    select,
    input {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    select {
      padding-right: 3ch;
    }
  }
}
</style>
