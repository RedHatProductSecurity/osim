<script setup lang="ts">
import { computed, ref } from 'vue';

import FlawAffectsTableRow from '@/components/FlawAffects/FlawAffectsTableRow.vue';
import CvssCalculatorOverlayed from '@/components/CvssCalculator/CvssCalculatorOverlayed.vue';

import { useFlawAffectsModel } from '@/composables/useFlawAffectsModel';

import { CVSS_V3 } from '@/constants';
import type { ZodAffectType } from '@/types';
import { useAffectsEditingStore } from '@/stores/AffectsEditingStore';
import { IssuerEnum } from '@/generated-client';
import Modal from '@/widgets/Modal/Modal.vue';

import { displayModes } from './flawAffectConstants';
import FlawAffectsTableHead from './FlawAffectsTableHead.vue';

defineProps<{
  errors: null | Record<string, any>;
  totalPages: number;
}>();

const affects = defineModel<ZodAffectType[]>('affects', { default: [] });
const emit = defineEmits<{
  'affect:remove': [value: ZodAffectType];
  'affect:toggle-selection': [value: ZodAffectType];
  'affect:track': [value: ZodAffectType];
  'affect:updateCvss': [affect: ZodAffectType, newVector: string, newScore: null | number, cvssScoreIndex: number];
  'affects:display-mode': [value: displayModes];
}>();
const affectCalculatorIndex = ref(-1);

const { selectedAffects } = useAffectsEditingStore();

const { isAffectBeingRemoved, modifiedAffects } = useFlawAffectsModel();

const newAffects = computed(() => affects.value?.filter(affect => !affect.uuid) ?? []);

function isModified(affect: ZodAffectType) {
  return modifiedAffects.value.includes(affect);
}

function isNewAffect(affect: ZodAffectType) {
  return newAffects.value.includes(affect);
}

function affectCvss(affect: ZodAffectType) {
  return affect.cvss_scores.find(({ cvss_version, issuer }) => issuer === IssuerEnum.Rh && cvss_version === CVSS_V3);
}

const cvssVersion = computed(() => {
  const affect = affects.value[affectCalculatorIndex.value];
  return affect?.cvss_scores.find(({ cvss_version }) => cvss_version === CVSS_V3)?.cvss_version;
});
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
          :isSelected="selectedAffects.includes(affect)"
          :isLast="affectIndex === affects.length - 1"
          :affectIndex
          :affectCalculatorIndex
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
          @affect:openCalculator="(index) => {
            affectCalculatorIndex = index;
          }"
        />
      </template>
    </tbody>
  </table>
  <Modal
    :show="affectCalculatorIndex > -1"
    style="max-width: fit-content;"
  >
    <template #header>
      <div class="d-flex align-items-center" style="width: 100%;">
        <select>
          <!-- TODO: Use cvssVersions from constants once V4 is available -->
          <option>
            3.1
          </option>
        </select>
        <span class="mx-auto fw-bold"> Affect CVSS Calculator </span>
        <button
          type="button"
          class="btn-close ms-3"
          aria-label="Close"
          @click="affectCalculatorIndex = -1"
        />
      </div>
    </template>
    <template #body>
      <CvssCalculatorOverlayed
        :id="affectCvss(affects[affectCalculatorIndex])?.uuid"
        :affectCalculatorIndex
        :cvssVector="affectCvss(affects[affectCalculatorIndex])?.vector"
        :cvssScore="affectCvss(affects[affectCalculatorIndex])?.score"
        @updateAffectCvss="(vectorValue, scoreValue) => emit(
          'affect:updateCvss',
          affects[affectCalculatorIndex],
          vectorValue,
          scoreValue,
          affects[affectCalculatorIndex].cvss_scores.findIndex(
            cvss => cvss.uuid == affectCvss(affects[affectCalculatorIndex]
            )?.uuid)
        )"
      />
    </template>
  </Modal>
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
