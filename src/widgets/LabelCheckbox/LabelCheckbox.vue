<script setup lang="ts">
defineProps<{
  label: string;
}>();

const modelValue = defineModel<boolean | undefined>();

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <div class="osim-input ps-3" :class="$attrs.class">
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
  user-select: none;
}
</style>
