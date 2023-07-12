<script setup lang="ts">

import {nextTick, onMounted, ref} from 'vue';

const props = defineProps<{
  modelValue: string,
  label: string,
  error?: string,
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
  <label class="osim-input has-validation mb-3 border-start ps-3">
    <span class="form-label">
      {{ label }}
      <!--attrs: {{ $attrs }}-->
    </span>
<!--    @focus="resizeTextarea"-->
<!--    @keyup="resizeTextarea"-->
    <textarea
        class="form-control"
        :class="{'is-invalid': error != null}"
        v-bind="$attrs"
        :value="modelValue"
        rows="5"
        :ref="elTextArea"
        @input="$emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).value)"
    ></textarea>
    <span
        class="invalid-feedback d-block"
        v-if="error"
    >{{ error }}</span>
  </label>

</template>

<style scoped>

.osim-input {
  display: block;
}

</style>
