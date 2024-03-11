<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  label: string;
}>();
</script>

<template>
  <div class="osim-input border-start ps-3">
    <label class="form-check h-100 d-inline-block ps-4 p-1">
      <input
        type="checkbox"
        :checked="modelValue"
        class="form-check-input"
        v-bind="$attrs"
        :value="modelValue"
        @change="
          $emit('update:modelValue', (($event as InputEvent).target as HTMLInputElement).checked)
        "
      />
      <p class="d-flex align-items-center mb-0">
        <!-- <span class="form-check-label"> -->
          {{ label }}
        <!-- </span> -->
      </p>
    </label>
  </div>
</template>

<style scoped>
.osim-input {
  display: block;
}

</style>
