<script setup lang="ts">
defineProps<{
  show: boolean,
}>();
</script>

<template>
  <div v-if="show" class="menu">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  display: block;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgb(0 0 0 / 15%);
  border-radius: 0.25rem;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 0.5rem 1rem rgb(0 0 0 / 15%);

  > * {
    display: block;
    width: 100%;
    padding: 0.25rem 1.5rem;
    clear: both;
    white-space: nowrap;
    cursor: pointer;
    font-size: .85rem;

    &:hover {
      background-color: #dee2e6;
    }
  }
}
</style>
