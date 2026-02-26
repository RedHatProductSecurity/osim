<script setup lang="ts">
defineProps<{
  highlighted?: boolean;
  label: string;
  loading?: boolean;
}>();
</script>

<template>
  <div class="osim-input ps-3">
    <div class="row">
      <span
        class="form-label col-3 position-relative"
        :class="{ 'border-start border-primary border-3 bg-primary bg-opacity-10 ps-2': highlighted }"
      >
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
