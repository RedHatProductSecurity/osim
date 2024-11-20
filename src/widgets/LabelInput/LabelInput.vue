<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    error?: null | string;
    label: string;
    modelValue: any;
    type?:
      | 'button'
      | 'checkbox'
      | 'color'
      | 'date'
      | 'datetime-local'
      | 'email'
      | 'file'
      | 'hidden'
      | 'image'
      | 'month'
      | 'number'
      | 'password'
      | 'radio'
      | 'range'
      | 'reset'
      | 'search'
      | 'submit'
      | 'tel'
      | 'text'
      | 'time'
      | 'url'
      | 'week';
  }>(),
  {
    modelValue: '',
    type: undefined,
    error: undefined,
  },
);
defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();
const type = computed<string>(() => props.type ?? 'text');
</script>

<template>
  <label class="osim-input mb-2 ps-3">
    <div class="row">
      <span class="form-label col-3 gx-2">
        {{ label }}
        <!--attrs: {{ $attrs }}-->
      </span>
      <div class="col-9">
        <input
          class="form-control"
          :type="type"
          :class="{ 'is-invalid': error != null }"
          v-bind="$attrs"
          :value="modelValue"
          @input="
            $emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)
          "
        />
      </div>
      <span v-if="error" class="invalid-feedback d-block">{{ error }}</span>
    </div>
  </label>
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
