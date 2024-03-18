<!-- 
  This widget is used for LabelInput fields with an embedded collapse
  the collapse is shown/hidden based on the input focus
  NOTE: Slot child focusable elements should have preventDefault() on mousedown event
        to prevent blur on parent focus
 -->

<script setup lang="ts">
import { computed, ref } from 'vue';

defineEmits<{
  'update:modelValue': [value: string | undefined],
  'customInputChange': [value: string | undefined]
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
      | 'week'
      | 'custom';
  }>(),
  {
    modelValue: '',
    type: undefined,
    error: undefined,
  },
);

const input = ref();
const focused = ref(false);
const type = computed<string>(() => props.type ?? 'text');

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
};
</script>

<template>
  <div tabindex="0" @focus="focused=true; input.focus()" @blur="focused=false">
    <label class="osim-input has-validation mb-3 ps-3">
      <div class="row">
        <span class="form-label col-3">
          {{ label }}
        </span>
        <div class="col-9">
          <div
            v-if="type==='custom'"
            ref="input"
            contenteditable
            name="customInput"
            class="form-control text-break"
            :class="{ 'is-invalid': error != null, 'text-cursor': focused }"
            v-bind="$attrs"
            @focus="focused = true"
            @blur="focused = false"
            @keydown="handleKeyDown"
            @input="
              $emit('customInputChange', input.textContent);
            "
          >
            <slot name="customInput" />
          </div>
          <input
            v-else
            ref="input"
            class="form-control"
            :type="type"
            :class="{ 'is-invalid': error != null }"
            v-bind="$attrs"
            :value="modelValue"
            @input="
              $emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)
            "
            @focus="focused = true"
            @blur="focused = false"
          />
        </div>
        <span v-if="error" class="invalid-feedback d-block">{{ error }}</span>
      </div>
    </label>
    <div
      class="row"
      :class="{ 'visually-hidden': !focused }"
    >
      <slot name="collapsable" />
    </div>
  </div>
</template>

<style scoped>
.osim-input {
  display: block;
}

.text-cursor {
  cursor: text;
}
</style>
