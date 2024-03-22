<script setup lang="ts">
// import type {Tracker} from '@/generated-client';

defineProps<{
  // tracker: Tracker
  tracker: any
}>();


</script>

<template>
  <div class="osim-content container">
    <div class="row osim-tracker-fixmeup">
      {{ JSON.stringify(tracker, null, 2) }}
    </div>
  </div>
</template>

<style scoped>
.osim-tracker-fixmeup {
  white-space: pre-wrap;
  font-family: "DejaVu Sans Mono", monospace;
}
</style>
