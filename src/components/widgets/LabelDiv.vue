<script setup lang="ts">
defineProps<{
  label: string,
  error?: string,
}>();

</script>

<template>
  <div class="osim-input mb-3 border-start ps-3">
    <span class="form-label">
      {{ label }}
      <!--attrs: {{ $attrs }}-->
    </span>
    <slot></slot>
  </div>

</template>
