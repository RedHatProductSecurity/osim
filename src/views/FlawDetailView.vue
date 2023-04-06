<script setup lang="ts">
import {onMounted, ref} from 'vue';
import IssueDetails from '../components/IssueDetails.vue';
import {getFlaw} from '@/services/FlawService';

const flaw = ref(null);
const props = defineProps<{
  id: string
}>();

onMounted(() => {
  getFlaw(props.id)
      .then(theFlaw => flaw.value = theFlaw)
      .catch(err => console.error(err))
});
</script>

<template>
  <main>
    <IssueDetails v-if="flaw" :flaw="flaw"/>
  </main>
</template>
