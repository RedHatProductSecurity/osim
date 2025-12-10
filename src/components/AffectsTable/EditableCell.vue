<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';

import type { Column, Getter, Row, Table } from '@tanstack/vue-table';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';
import TagsInput from '@/widgets/TagsInput/TagsInput.vue';

import CvssCalculatorBase from '../CvssCalculator/CvssCalculatorBase.vue';

const props = defineProps<{
  column: Column<ZodAffectType, unknown>;
  getValue: Getter<ZodAffectType[keyof ZodAffectType]>;
  row: Row<ZodAffectType>;
  table: Table<ZodAffectType>;
}>();

const columnMeta = props.column.columnDef.meta;

const isSubpackagePurls = props.column.id === 'subpackage_purls';

const getInitialValue = () => {
  const value = props.getValue();
  // Ensure subpackage_purls always has an array value
  if (isSubpackagePurls && !Array.isArray(value)) {
    return [];
  }
  return value;
};

const cellValue = ref(getInitialValue());
const editMode = ref(false);
const inputRef = ref();
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
  if (isSubpackagePurls) {
    const purls = cellValue.value as string[];
    value = purls?.length ? `${purls.length} PURL(s)` : '';
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

const tooltipValue = computed(() => {
  if (isSubpackagePurls) {
    const purls = cellValue.value as string[];
    return purls?.length ? purls.join('\n') : '';
  }
  return '';
});

const onBlur = () => {
  editMode.value = !editMode.value;

  if (cellValue.value !== props.getValue()) {
    tableMeta?.updateData(
      props.row.index,
      props.column.id as keyof ZodAffectType,
      cellValue.value,
      props.row.getParentRow()?.index,
    );
    if (columnMeta?.onValueChange) {
      columnMeta.onValueChange(cellValue.value, props.row, props.table);
    }
  }
};

const toggleEditMode = () => {
  if (tableMeta?.filingTracker.has(props.row.id) || (metaEnum.value && !Object.keys(metaEnum.value).length)) {
    return;
  }
  editMode.value = !editMode.value;
  nextTick(() => {
    inputRef?.value?.focus();
  });
};

watch(() => props.getValue(), (newValue) => {
  if (isSubpackagePurls && !Array.isArray(newValue)) {
    cellValue.value = [];
  } else {
    cellValue.value = newValue;
  }
});
</script>
<template>
  <span
    v-if="!editMode"
    tabindex="0"
    :title="tooltipValue"
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
    <template v-else-if="isSubpackagePurls">
      <TagsInput
        v-model="cellValue as string[]"
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
