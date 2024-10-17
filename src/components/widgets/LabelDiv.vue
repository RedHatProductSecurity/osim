<script setup lang="ts">
defineProps<{
  error?: string;
  label: string;
  loading?: boolean;
}>();
</script>

<template>
  <div class="osim-input ps-3" v-bind="$attrs">
    <div class="row">
      <span class="form-label col-3 position-relative">
        <span v-if="loading" v-osim-loading.grow="loading" class="throbber" />
        <slot name="labelSlot" />
        {{ label }}
        <!--attrs: {{ $attrs }}-->
      </span>
      <div class="col-9">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.throbber {
  position: absolute;
  left: 1rem;
}
</style>
