<script setup lang="ts">
import sanitizeHtml from 'sanitize-html';
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  label: string;
  error?: string;
  hasTopLabelStyle?: boolean;
}>();


const sanitizedModelValue = computed(() => {
  return sanitizeHtml(props.modelValue, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['span']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'span': ['class']
    }
  });
});
</script>

<template>
  <div class="osim-static-label osim-input mb-3 ps-3">
    <div v-if="hasTopLabelStyle" class="osim-static-label-top-style">
      <span class="top-label">
        {{ label }}
      </span>
      <div :class="{ 'alert alert-warning': !modelValue }">
        <span class="form-control" v-html="sanitizedModelValue"></span>
      </div>
    </div>
    <div v-else class="row">
      <span class="form-label col-3">
        {{ label }}
      </span>
      <div class="col-9" :class="{ 'alert alert-warning': !modelValue }">
        <span class="form-control" v-html="sanitizedModelValue"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.osim-static-label span.form-control {
  word-wrap: break-word;
}

.osim-static-label .osim-static-label-top-style .top-label {
  display: inline-block;
  background-color: #DEE2E6;
  border-top-left-radius: .5rem;
  border-top-right-radius: .5rem;
  padding: 375rem .25rem 1rem 1rem;
}
</style>
