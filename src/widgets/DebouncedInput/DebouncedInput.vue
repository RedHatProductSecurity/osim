<script lang="ts" setup>
import type { InputHTMLAttributes } from 'vue';
import { computed, onBeforeUnmount, ref } from 'vue';

interface DebouncedInputProps extends /* @vue-ignore */ InputHTMLAttributes {
  debounce?: number;
  modelValue: number | string;
}

const props = withDefaults(defineProps<DebouncedInputProps>(), {
  debounce: 250,
});

const emit = defineEmits(['update:modelValue']);

const timeout = ref<ReturnType<typeof setTimeout>>();

const localValue = computed({
  get: () => props.modelValue,
  set: (newValue) => {
    if (timeout.value) {
      clearTimeout(timeout.value);
    }
    timeout.value = setTimeout(
      () => emit('update:modelValue', newValue),
      props.debounce,
    );
  },
});
onBeforeUnmount(() => clearTimeout(timeout.value));
</script>

<template>
  <input v-model="localValue" />
</template>
