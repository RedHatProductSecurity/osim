<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  error?: string;
  hasTopLabelStyle?: boolean;
  label: string;
  modelValue: null | number | string | undefined;
}>();

const emptyModel = computed(() => {
  return props.modelValue === null || props.modelValue === undefined;
});
</script>

<template>
  <div class="osim-static-label osim-input mb-2 ps-3">
    <div v-if="hasTopLabelStyle" class="osim-static-label-top-style">
      <span class="top-label">
        {{ label }}
      </span>
      <div class="top-left-corner">
        <span
          class="form-control top-left-corner"
          :class="{ 'alert alert-warning': emptyModel }"
        >
          {{ modelValue }}
        </span>
      </div>
    </div>
    <div v-else class="row">
      <span class="form-label col-3">
        {{ label }}
      </span>
      <div class="col-9">
        <span class="form-control" :class="{ 'alert alert-warning': emptyModel }">{{ modelValue }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.osim-static-label span.form-control {
  word-wrap: break-word;
}

span.form-control.alert {
  padding-block: 10px;
}

.osim-static-label .osim-static-label-top-style .top-label {
  display: inline-block;
  background-color: #dee2e6;
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.375rem 1rem 0.25rem;
}

.top-left-corner {
  border-top-left-radius: 0;
}
</style>
