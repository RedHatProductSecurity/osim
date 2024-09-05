<script setup lang="ts">
import TagsInput from './TagsInput.vue';

withDefaults(defineProps<{
  error?: string | string[];
  label?: string;
}>(), {
  label: '',
  error: undefined,
});

const modelValue = defineModel<string[]>({ required: true });
</script>

<template>
  <label class="osim-input ps-3 mb-2 input-group">
    <div class="row">
      <span class="form-label col-3">
        <slot name="label">
          {{ label }}
        </slot>
      </span>
      <div class="col-9">
        <TagsInput :modelValue :error />
      </div>
    </div>
  </label>
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
