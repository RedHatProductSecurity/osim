<script setup lang="ts">
defineProps<{
  label: string,
  error?: string,
}>();

</script>

<template>
  <div class="osim-input mb-3 border-start ps-3">
    <div class="row">
      <span class="form-label col-3">
        {{ label }}
        <!--attrs: {{ $attrs }}-->
      </span>
      <div class="col-9">
        <slot></slot>
      </div>
    </div>
  </div>

</template>
