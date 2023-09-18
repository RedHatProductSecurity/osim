<script setup lang="ts">

import {computed} from 'vue';

const props = defineProps<{
  modelValue: any,
  label: string,
  error?: string,
  type?: 'text' | 'date' | 'reset' | 'button' | 'checkbox' | 'color' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'search' | 'submit' | 'tel' | 'time' | 'url' | 'week',
}>();

const type = computed<string>(() => (props.type ?? 'text'));

</script>

<template>
  <label class="osim-input has-validation mb-3 border-start ps-3">
    <span class="form-label">
      {{ label }}
      <!--attrs: {{ $attrs }}-->
    </span>
    <input
        class="form-control"
        :type="type"
        :class="{'is-invalid': error != null}"
        v-bind="$attrs"
        :value="modelValue"
        @input="$emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)"
    />
    <span
        v-if="error"
        class="invalid-feedback d-block"
    >{{ error }}</span>
  </label>

</template>

<style scoped>

.osim-input {
  display: block;
}

</style>
