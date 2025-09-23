<script setup lang="ts">
defineProps<{
  tooltip: string;
}>();
</script>

<template>
  <span class="ms-1" :title="tooltip">
    <i class="bi bi-exclamation-diamond-fill  px-1 " />
    <i class="bi bi-exclamation-diamond text-dark  px-1 " />
  </span>
</template>

<style scoped lang="scss">
i {
  background-color: transparent;
  position: absolute;
  top: -1.175rem;
  left: -0.575rem;
  color: var(--bs-warning);

  &:first-of-type {
    animation: nudge-shadow 1.25s ease-in-out infinite;
  }
}

span {
  background-color: transparent;
  position: relative;
}

@keyframes nudge-shadow {
  0%,
  100% {
    text-shadow: 0 0 0.2rem red;
  }

  50% {
    text-shadow: 0 0 0 red;
  }
}
</style>
