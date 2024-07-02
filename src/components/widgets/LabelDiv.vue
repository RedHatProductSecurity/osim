<script setup lang="ts">
defineProps<{
  label: string,
  error?: string,
}>();

</script>

<template>
  <div class="osim-input mb-2 ps-3" v-bind="$attrs">
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
