<script lang="ts" setup>
import { computed, ref } from 'vue';

import type { Column, Row } from '@tanstack/vue-table';

import type { ZodAffectCVSSType, ZodAffectType } from '@/types';
import { affectRhCvss3 } from '@/utils/helpers';
import TagsInput from '@/widgets/TagsInput/TagsInput.vue';

import CvssCalculatorBase from '../CvssCalculator/CvssCalculatorBase.vue';

const props = defineProps<{
  column: Column<ZodAffectType, unknown>;
  modelValue: Partial<ZodAffectType>[keyof ZodAffectType];
  virtualRow: { original: Partial<ZodAffectType> };
}>();

const emit = defineEmits<{
  'applyBulkEdit': [];
  'fieldChanged': [columnId: string, value: any];
  'update:modelValue': [value: any];
}>();

const columnMeta = props.column.columnDef.meta;
const isSubpackagePurls = props.column.id === 'subpackage_purls';
const cellValue = ref<string | string[] | ZodAffectCVSSType[]>(
  (props.modelValue as string | string[] | undefined | ZodAffectCVSSType[])
  ?? (columnMeta?.cvss ? [] : isSubpackagePurls ? [] : ''),
);
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

const isClearable = computed(() => columnMeta?.clearable ?? true);

const onChange = () => {
  emit('update:modelValue', cellValue.value);
  emit('fieldChanged', props.column.id, cellValue.value);
  isCalculatorOpen.value = false;
};

const onClear = () => {
  cellValue.value = (columnMeta?.cvss || isSubpackagePurls) ? [] : '';

  // Trigger the change event to update bulk edit data
  onChange();
  // Emit event to trigger immediate application
  emit('applyBulkEdit');
};
</script>
<template>
  <template v-if="isEditable">
    <template v-if="metaEnum">
      <div class="d-flex gap-1">
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
        <button
          v-if="isClearable"
          class="btn btn-sm btn-secondary px-2"
          type="button"
          title="Clear this field for selected affects"
          @click="onClear"
        >
          ×
        </button>
      </div>
    </template>
    <template v-else-if="columnMeta?.cvss">
      <template v-if="!isCalculatorOpen">
        <div class="d-flex gap-1">
          <div
            class="flex-grow-1 form-control"
            style="cursor: pointer;"
            @click="isCalculatorOpen= true"
          >
            {{ affectRhCvss3({ cvss_scores: cellValue as ZodAffectCVSSType[] })?.score ?? 0 }}
          </div>
          <button
            v-if="isClearable"
            class="btn btn-sm btn-secondary px-2"
            type="button"
            title="Clear CVSS scores for selected affects"
            @click="onClear"
          >
            ×
          </button>
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
    <template v-else-if="isSubpackagePurls">
      <div class="d-flex gap-1">
        <TagsInput
          v-model="cellValue as string[]"
          class="flex-grow-1"
          @blur="onChange"
        />
        <button
          v-if="isClearable"
          class="btn btn-sm btn-secondary px-2"
          type="button"
          title="Clear subpackage PURLs for selected affects"
          @click="onClear"
        >
          ×
        </button>
      </div>
    </template>
    <template v-else>
      <div class="d-flex gap-1">
        <input
          v-model="cellValue"
          class="form-control"
          type="text"
          placeholder="—"
          @input="onChange"
        >
        <button
          v-if="isClearable"
          class="btn btn-sm btn-secondary px-2"
          type="button"
          title="Clear this field for selected affects"
          @click="onClear"
        >
          ×
        </button>
      </div>
    </template>
  </template>
  <template v-else>
    <span class="text-muted">—</span>
  </template>
</template>
