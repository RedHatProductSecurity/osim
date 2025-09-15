<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import type { Column, Getter, Row, Table } from '@tanstack/vue-table';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';

import CvssCalculatorBase from '../CvssCalculator/CvssCalculatorBase.vue';

const props = defineProps<{
  column: Column<ZodAffectType, unknown>;
  getValue: Getter<ZodAffectType[keyof ZodAffectType]>;
  row: Row<ZodAffectType>;
  table: Table<ZodAffectType>;
}>();

const cellValue = ref(props.getValue());
const editMode = ref(false);
const inputRef = ref();

const columnMeta = props.column.columnDef.meta;
const tableMeta = props.table.options.meta;
const metaEnum = computed(() =>
  columnMeta?.enum
  && (typeof columnMeta.enum === 'function'
    ? columnMeta.enum(props.row)
    : columnMeta?.enum),
);

const displayValue = computed(() => {
  let value: number | string = cellValue.value as string;
  if (columnMeta?.cvss) {
    value = affectRhCvss3({ cvss_scores: cellValue.value } as ZodAffectType)?.score ?? 0;
  }
  if (columnMeta?.extraColumn) {
    // Access object using dot notation
    const extraValue = columnMeta?.extraColumn?.split('.')
      .reduce((o, i) => o?.[i], props.row.original as any);

    if (extraValue) {
      value += ` / ${extraValue}`;
    }
  }
  return value;
});

const onBlur = () => {
  editMode.value = !editMode.value;

  if (cellValue.value !== props.getValue()) {
    tableMeta?.updateData(props.row.index, props.column.id as keyof ZodAffectType, cellValue.value);
    if (columnMeta?.onValueChange) {
      columnMeta.onValueChange(cellValue.value, props.row, props.table);
    }
  }
};

const toggleEditMode = () => {
  if (metaEnum.value && !Object.keys(metaEnum.value).length) {
    return;
  }
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
    tabindex="0"
    @dblclick="toggleEditMode"
    @keyup.tab="toggleEditMode"
  >{{ displayValue || '&nbsp;' }}</span>
  <template v-else>
    <template v-if="metaEnum">
      <select
        ref="inputRef"
        v-model="cellValue"
        @blur="onBlur"
        @keypress.enter="onBlur"
      >
        <option
          v-for="(value, key) in metaEnum"
          :key
          :value
        >{{ value }}</option>
      </select>
    </template>
    <template v-else-if="columnMeta?.cvss">
      <CvssCalculatorBase
        class="overlayed"
        :cvssEntity="{cvss_scores: cellValue as ZodAffectCVSSType[], ps_component: ''}"
        @change:cvss_scores="(newCvssScores) => cellValue = newCvssScores"
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
        @keypress.enter="onBlur"
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
