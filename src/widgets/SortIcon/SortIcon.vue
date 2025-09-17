<script lang="ts" setup>
defineProps<{
  direction: 'asc' | 'desc' | false | undefined;
}>();
</script>
<template>
  <span
    v-if="!direction"
    class="unsorted"
  >
    <i class="bi-caret-up-fill"></i>
    <i class="bi-caret-down-fill"></i>
  </span>
  <i
    v-else-if="direction === 'asc'"
    class="bi-caret-up-fill"
  ></i>
  <i
    v-else-if="direction === 'desc'"
    class="bi-caret-down-fill"
  ></i>
</template>
<style lang="scss" scoped>
.unsorted {
  --button-size: 0.9em;
  --icon-offset: 29%;

  overflow: hidden;
  position: relative;
  font-size: 1rem;
  display: inline-block;
  color: var(--bs-secondary);
  width: var(--button-size);
  height: var(--button-size);

  i {
    display: grid;
    position: absolute;
    font-size: var(--button-size);

    &.bi-caret-down-fill {
      top: var(--icon-offset);
    }

    &.bi-caret-up-fill {
      bottom: var(--icon-offset);
    }
  }
}
</style>
