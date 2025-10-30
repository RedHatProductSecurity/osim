<script lang="ts" setup>
import { computed, ref } from 'vue';

import type { Column, Row } from '@tanstack/vue-table';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';

import CvssCalculatorBase from '../CvssCalculator/CvssCalculatorBase.vue';

const props = defineProps<{
  column: Column<ZodAffectType, unknown>;
  modelValue: Partial<ZodAffectType>[keyof ZodAffectType];
  virtualRow: { original: Partial<ZodAffectType> };
}>();

const emit = defineEmits<{
  'fieldChanged': [columnId: string, value: any];
  'update:modelValue': [value: any];
}>();

const columnMeta = props.column.columnDef.meta;
const cellValue = ref<string | ZodAffectCVSSType[]>(props.modelValue ?? columnMeta?.cvss ? [] : '');
const isCalculatorOpen = ref(false);

// Determine if this column has an enum (dropdown)
const metaEnum = computed(() => {
  if (!columnMeta?.enum) return null;

  // For bulk edit, use the virtual row to evaluate enum functions
  // This allows conditional enums to work correctly (e.g., resolution based on affectedness)
  if (typeof columnMeta.enum === 'function') {
    return columnMeta.enum(props.virtualRow as Row<ZodAffectType>);
  }
  return columnMeta.enum;
});

// Determine if this field is editable in bulk mode
const isEditable = computed(() => columnMeta?.bulkEditable ?? false);

const onChange = () => {
  emit('update:modelValue', cellValue.value);
  emit('fieldChanged', props.column.id, cellValue.value);
  isCalculatorOpen.value = false;
};
</script>
<template>
  <template v-if="isEditable">
    <template v-if="metaEnum">
      <select
        v-model="cellValue"
        class="form-select"
        @change="onChange"
      >
        <option value="">—</option>
        <option
          v-for="(value, key) in metaEnum"
          :key="key"
          :value="value"
        >{{ value }}</option>
      </select>
    </template>
    <template v-else-if="columnMeta?.cvss">
      <template v-if="!isCalculatorOpen">
        <div @click="isCalculatorOpen= true">
          {{ affectRhCvss3({ cvss_scores: cellValue as ZodAffectCVSSType[] })?.score ?? 0 }}
        </div>
      </template>
      <CvssCalculatorBase
        v-else
        class="overlayed"
        :cvssEntity="{cvss_scores: cellValue as ZodAffectCVSSType[], ps_component: ''}"
        @change:cvss_scores="(newCvssScores) => cellValue = newCvssScores"
        @blur="onChange"
      />
    </template>
    <template v-else>
      <input
        v-model="cellValue"
        class="form-control"
        type="text"
        placeholder="—"
        @input="onChange"
      >
    </template>
  </template>
  <template v-else>
    <span class="text-muted">—</span>
  </template>
</template>
