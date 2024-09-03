<script setup lang="ts">
import { ref } from 'vue';

import FlawForm from '@/components/FlawForm.vue';

import { blankFlaw } from '@/composables/useFlawModel';

const flaw = ref(blankFlaw());
</script>

<template>
  <main>
    <FlawForm v-model:flaw="flaw" :relatedFlaws="[]" mode="create" />
  </main>
</template>

<style scoped>
textarea {
  margin-top: 1em;
  white-space: pre-wrap;
  width: 100%;
  height: 20em;
}
</style>
