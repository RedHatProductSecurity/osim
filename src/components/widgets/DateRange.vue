<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';
import { DateRange } from '@/composables/useSearchParams';
import EditableDate from '@/components/widgets/EditableDate.vue';


const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);
const error = ref<string | null>(null);

const localSelectedOption = ref(props.modelValue.type || '');
const localStart = ref(props.modelValue.start || null);
const localEnd = ref(props.modelValue.end || null);

const emitRange = () => {
  const range: Record<string, string> = { type: localSelectedOption.value };
  error.value = null;
  if (localSelectedOption.value === DateRange.CUSTOM) {
    range.start = localStart.value;
    range.end = localEnd.value;
    if (new Date(range.start) > new Date(range.end)) {
      error.value = 'End Date is must be after start Date';
    }
  }
  emit('update:modelValue', range);
};

watch([localStart, localEnd], emitRange);

watch(localSelectedOption, () => {
  localStart.value = null;
  localEnd.value = null;
  error.value = null;
  emitRange();
});
</script>

<template>
  <select
    v-model="localSelectedOption"
    class="form-select form-date-option"
    @submit.prevent
  >
    <option :value="DateRange.THIS_WEEK">This Week</option>
    <option :value="DateRange.LAST_WEEK">Last Week</option>
    <option :value="DateRange.THIS_MONTH">This Month</option>
    <option :value="DateRange.LAST_MONTH">Last Month</option>
    <option :value="DateRange.CUSTOM">Custom</option>
  </select>
  <div v-if="localSelectedOption === DateRange.CUSTOM" class="form-date-custom">
    <EditableDate
      v-model="localStart"
    />
    <EditableDate
      v-model="localEnd"
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
