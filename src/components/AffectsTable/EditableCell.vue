<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import type { Column, Getter, Row, Table } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';

import CvssCalculatorBase from '../CvssCalculator/CvssCalculatorBase.vue';

const props = defineProps<{
  column: Column<ZodAffectType, unknown>;
  getValue: Getter<unknown>;
  row: Row<ZodAffectType>;
  table: Table<ZodAffectType>;
}>();

const cellValue = ref(props.getValue());
const editMode = ref(false);
const inputRef = ref();

const columnMeta = props.column.columnDef.meta;
const tableMeta = props.table.options.meta;

const displayValue = computed(() => {
  if (columnMeta?.cvss) {
    return affectRhCvss3({ cvss_scores: cellValue.value } as ZodAffectType)?.score;
  }
  return cellValue.value;
});

const onBlur = () => {
  editMode.value = !editMode.value;

  if (cellValue.value !== props.getValue()) {
    tableMeta?.updateData(props.row.index, props.column.id, cellValue.value);
  }
};

const toggleEditMode = () => {
  editMode.value = !editMode.value;
  nextTick(() => {
    inputRef?.value?.focus();
  });
};

watch(() => props.getValue(), (newValue) => {
  cellValue.value = newValue;
});
</script>
<template>
  <span
    v-if="!editMode"
    @dblclick="toggleEditMode"
  >{{ displayValue || '&nbsp;' }}</span>
  <template v-else>
    <template v-if="columnMeta?.enum">
      <select
        ref="inputRef"
        v-model="cellValue"
        @blur="onBlur"
      >
        <option
          v-for="(value, key) in columnMeta.enum"
          :key
          :value
        >{{ key.toUpperCase() }}</option>
      </select>
    </template>
    <template v-if="columnMeta?.cvss">
      <CvssCalculatorBase
        class="overlayed"
        :cvssEntity="{cvss_scores: cellValue, ps_module: ''}"
        @change:cvss_score="(newCvssScores) => {
          cellValue = newCvssScores
        }"
        @blur="onBlur"
      />
    </template>
    <template v-else>
      <input
        ref="inputRef"
        v-model="cellValue"
        class="form-control"
        type="text"
        @blur="onBlur"
      >
    </template>
  </template>
</template>
<style lang="scss" scoped>
span {
  width: 100%;
  display: block;
}
</style>
