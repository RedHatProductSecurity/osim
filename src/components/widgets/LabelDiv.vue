<script setup lang="ts">
import {nextTick, onMounted, ref} from 'vue';

const props = defineProps<{
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

<style scoped>

</style>
