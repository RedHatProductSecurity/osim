<template>
  <button ref="osimButton" class="osim-button" :style="backgroundColorRule">
    <p class="osim-button-face" :class="$attrs.class">
      <slot />
    </p>
  </button>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const osimButton = ref<HTMLElement | null>(null);
const backgroundColor = computed(() =>
  foregroundColor.value.replace(/\d+/g, (rbgValue: string) => {
    const adjustedValue = Number(rbgValue) - 50;
    const darkenedValue = adjustedValue < 0 ? 0 : adjustedValue;
    return darkenedValue.toString();
  })
);


const backgroundColorRule = computed(() => {
  return `background-color: ${backgroundColor.value};`;
});

const foregroundColor = ref<string>('');

onMounted(() => {
  const computedStyle = osimButton.value ? window.getComputedStyle(osimButton.value) : null;
  console.log(computedStyle?.backgroundColor);
  if (computedStyle?.backgroundColor){
    foregroundColor.value = computedStyle.backgroundColor;
  }
});
</script>

<style scoped lang="scss">

  .osim-button {
    border-radius: 12px;
    border: none;
    padding: 0;
    outline-offset: 4px;
  }

  .osim-button-face {
    cursor: pointer;
    padding: .75rem 1rem;
    border-radius: .75rem;
    color: white;
    transform: translateY(-3px);
    text-shadow: 1px 1px 0 v-bind(backgroundColor);

    // :slotted(.bi) {
    // }
  }

  .pushable:active .front {
    transform: translateY(-2px);
  }



</style>
