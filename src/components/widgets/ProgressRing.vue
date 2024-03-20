<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  diameter: number,
  progress: number,
  stroke: number,
  color: string,
  direction?: 'up' | 'down',
  transitionDurationMs?: number,
}>();
const transitionDuration = computed(() => (props.transitionDurationMs ?? 16) + 'ms');
const radius = computed(() => props.diameter / 2);
const normalizedRadius = computed(() => radius.value - props.stroke / 2);
const circumference = computed(() => normalizedRadius.value * 2 * Math.PI);
const strokeDashoffset = computed<number>(() => {
  return Math.min(circumference.value, Math.max(0,
    circumference.value - props.progress / 100 * circumference.value));
});
</script>

<template>
  <div>
    <svg
      :height="diameter"
      :width="diameter"
    >
      <circle
        shape-rendering="geometricPrecision"
        :stroke="color"
        fill="transparent"
        :stroke-dasharray="circumference + ' ' + circumference"
        :style="{ strokeDashoffset }"
        :class="{down: props.direction === 'down'}"
        :stroke-width="stroke"
        :r="normalizedRadius"
        :cx="radius"
        :cy="radius"
      />
    </svg>
  </div>
</template>

<style scoped>
circle {
  transition: stroke-dashoffset v-bind(transitionDuration); /* 1000ms / 60fps = 16ms */
  transform: rotate(-90deg);
  transform-origin: center;
}
circle.down {
  transform: rotate(-90deg) scale(1, -1);
}
</style>
