<script setup lang="ts">
import { ref } from 'vue';

defineEmits<{
  'update:modelValue': [value: string | undefined],
}>();
withDefaults(defineProps<{
  modelValue: string | null | undefined;
  label: string;
  error?: string;
  disabled?: boolean;
}>(), {
  error: '',
  disabled: false
});

const elTextArea = ref();

// onMounted(() => {
//   nextTick(() => {
//     if (elTextArea != null) {
//       elTextArea.disp
//     }
//   });
// });
// function resizeTextarea() {
//   if (elTextArea != null) {
//     elTextArea.style.height = elTextArea.scrollHeight + 'px';
//   }
// }
</script>

<template>
  <label class="osim-input mb-3 ps-3">
    <div class="row">
      <slot name="label">
        <span class="form-label col-3">
          {{ label }}
          <!--attrs: {{ $attrs }}-->
        </span>
      </slot>
      <!--    @focus="resizeTextarea"-->
      <!--    @keyup="resizeTextarea"-->
      <textarea
        v-bind="$attrs"
        :ref="elTextArea"
        class="form-control col-9 d-inline-block"
        :class="{ 'is-invalid': error }"
        :value="modelValue"
        :disabled="disabled"
        rows="5"
        @input="$emit(
          'update:modelValue',
          (($event as InputEvent).target as HTMLInputElement).value)
        "
      ></textarea>
      <span v-if="error" class="invalid-feedback d-block">{{ error }}</span>
    </div>
  </label>
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
