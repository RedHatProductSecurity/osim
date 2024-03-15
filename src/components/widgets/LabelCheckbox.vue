<script setup lang="ts">
defineProps<{
  label: string;
}>();

const modelValue = defineModel<boolean | undefined>();
</script>

<template>
  <div class="osim-input border-start ps-3">
    <label class="form-check h-100 d-inline-block ps-4 p-1">
      <input
        v-bind="$attrs"
        v-model="modelValue"
        type="checkbox"
        :checked="modelValue"
        class="form-check-input"
      />
      <span class="form-check-label">
        {{ label }}
      </span>
    </label>
  </div>
</template>

<style scoped>
.osim-input {
  display: block;
}
</style>
