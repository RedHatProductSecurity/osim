<script setup lang="ts">
import { ref, watch } from 'vue';
import { DateRangeTypeEnum } from '@/constants/range';
import EditableDate from '@/components/widgets/EditableDate.vue';

type DateRangeModel = {
  type?: DateRangeTypeEnum;
  start?: string;
  end?: string;
}

const model = defineModel<DateRangeModel>({
  type: Object,
  required: true,
  default: () => ({ type: undefined, start: undefined, end: undefined })
});

const error = ref<string | null>(null);

watch(() => [model?.value?.start, model?.value?.end], () => {
  error.value = null;
  if (model?.value?.type === DateRangeTypeEnum.CUSTOM && model.value.start && model.value.end) {
    if (new Date(model.value.start) >= new Date(model.value.end)) {
      error.value = 'End Date must be after Start Date';
    }
  }
});

watch(() => model?.value?.type, () => {
  if (model.value) {
    model.value.start = undefined;
    model.value.end = undefined;
    error.value = null;
  }
});
</script>

<template>
  <select
    v-model="model.type"
    class="form-select form-date-option"
  >
    <option
      v-for="(range, key) in DateRangeTypeEnum"
      :key="key"
      :value="range"
    >{{ range }}</option>
  </select>
  <div v-if="model.type === DateRangeTypeEnum.CUSTOM" class="form-date-custom">
    <EditableDate
      v-model="model.start"
    />
    <EditableDate
      v-model="model.end"
      :error="error"
    />
  </div>
</template>

<style>
.form-date-custom {
  display: flex;
  width: auto;
  flex-grow: 1;

  .osim-date {
    display: flex;
    width: auto;
    flex-grow: 1;
  }

  .osim-editable-date-value,
  .osim-editable-date-pen,
  .osim-cancel,
  .osim-date-edit-field input {
    border-radius: 0 !important;
  }
}
</style>
