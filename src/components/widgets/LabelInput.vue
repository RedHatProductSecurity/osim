<script setup lang="ts">
import { computed } from 'vue';

defineEmits<{
  'update:modelValue': [value: string | undefined],
}>();
const props = withDefaults(
  defineProps<{
    modelValue: any;
    label: string;
    error?: string | null;
    type?:
      | 'text'
      | 'date'
      | 'reset'
      | 'button'
      | 'checkbox'
      | 'color'
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
      | 'search'
      | 'submit'
      | 'tel'
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
