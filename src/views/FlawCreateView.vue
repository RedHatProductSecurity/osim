<script setup lang="ts">
import { ref } from 'vue';

import FlawForm from '@/components/FlawForm.vue';
import { blankFlaw } from '@/composables/useFlawModel';

const error = ref('');

// onMounted(() => {
//   getFlaw(props.id)
//       .then(theFlaw => flaw.value = theFlaw)
//       .catch(err => console.error(err))
// });

const flaw = ref(blankFlaw());
</script>

<template>
  <main>
    <div v-if="error !== ''" class="alert alert-danger">{{ error }}</div>
    <FlawForm v-model:flaw="flaw" mode="create" />
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
