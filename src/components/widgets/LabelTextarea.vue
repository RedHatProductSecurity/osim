<script setup lang="ts">
import { ref } from 'vue';

defineEmits<{
  'update:modelValue': [value: string | undefined],
}>();
defineProps<{
  modelValue: string | null | undefined;
  label: string;
  error?: string;
}>();

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
  <label class="osim-input has-validation mb-3 ps-3">
    <div class="row">
      <span class="form-label col-3">
        {{ label }}
        <!--attrs: {{ $attrs }}-->
      </span>
      <!--    @focus="resizeTextarea"-->
      <!--    @keyup="resizeTextarea"-->
      <textarea
        v-bind="$attrs"
        :ref="elTextArea"
        class="form-control col-9 d-inline-block"
        :class="{ 'is-invalid': error != null }"
        :value="modelValue"
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
