<script setup lang="ts">
import { ref } from 'vue';
import type { TextareaHTMLAttributes } from 'vue';

withDefaults(defineProps<{
  disabled?: boolean;
  error?: string;
  label: string;
  loading?: boolean;
  modelValue: null | string | undefined;
} & /* @vue-ignore */ TextareaHTMLAttributes>(), {
  error: '',
  disabled: false,
});
defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();
defineOptions({
  inheritAttrs: false,
});

const elTextArea = ref<HTMLTextAreaElement | null>(null);

defineExpose({
  elTextArea,
});

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
  <label class="osim-input mb-2 ps-3" :class="$attrs.class">
    <div class="row">
      <slot name="label">
        <span class="form-label col-3 position-relative">
          <span v-if="loading" v-osim-loading.grow="loading" class="throbber" />
          {{ label }}
          <!--attrs: {{ $attrs }}-->
        </span>
      </slot>
      <!--    @focus="resizeTextarea"-->
      <!--    @keyup="resizeTextarea"-->
      <textarea
        v-bind="$attrs"
        ref="elTextArea"
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

<style scoped lang="scss">
.osim-input {
  display: block;

  .throbber {
    position: absolute;
    left: 1rem;
  }

  textarea {
    position: relative;
  }
}
</style>
