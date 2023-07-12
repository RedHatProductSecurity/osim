<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean,
  label: string,
}>();

</script>

<template>
  <div class="osim-input border-start ps-3">
  <label class="form-check mb-3">
    <input
        type="checkbox"
        :checked="modelValue"
        class="form-check-input"
        v-bind="$attrs"
        :value="modelValue"
        @change="$emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).checked)"
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
