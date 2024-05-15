<script setup lang="ts">

import EditableText from './EditableText.vue';
import EditableDate from './EditableDate.vue';

const props = withDefaults(defineProps<{
  // modelValue: string,
  label?: string,
  type: 'text' | 'date' | 'datetime',
  // error: string,
  // required: boolean,
}>(), {
  label: '',
  // required: false,
});

const modelValue = defineModel<string | undefined | null | number | Date>();
</script>

<template>
  <label class="osim-input ps-3 mb-3 input-group">
    <div class="row">
      <span class="form-label col-3">
        <slot name="label">
          {{ label }}
        </slot>
      </span>
      <EditableDate
        v-if="props.type.includes('date')"
        v-model="modelValue as string"
        :class="$attrs.class"
        :includesTime="props.type === 'datetime'"
      />
      <EditableText
        v-else
        v-model="modelValue as string"
        :class="$attrs.class"
      />
    </div>
  </label>

</template>

<style scoped>

.osim-input {
  display: block;
}

</style>
