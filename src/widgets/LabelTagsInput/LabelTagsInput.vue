<script setup lang="ts">
import TagsInput from '@/widgets/TagsInput/TagsInput.vue';

withDefaults(defineProps<{
  error?: (null | string)[] | null | string;
  highlighted?: boolean;
  label?: string;
}>(), {
  error: undefined,
  highlighted: false,
  label: '',
});

const modelValue = defineModel<string[]>({ required: true });
</script>

<template>
  <label class="osim-input ps-3 mb-2 input-group">
    <div class="row">
      <span
        class="form-label col-3"
        :class="{ 'border-start border-primary border-3 bg-primary bg-opacity-10 ps-2': highlighted }"
      >
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

/* Ensure the row stretches to accommodate wrapped label content */
.row {
  align-items: stretch;
}

/* Make TagsInput stretch to match label height */
.col-9 {
  display: flex;
  align-items: stretch;
}

.col-9 :deep(.osim-pill-list) {
  min-height: 100%;
  display: flex;
  align-items: center;
}
</style>
