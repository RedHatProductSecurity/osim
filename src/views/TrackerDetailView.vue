<script setup lang="ts">
import {onMounted, ref} from 'vue';
import TrackerDetails from '../components/TrackerDetails.vue';
import {getTracker} from '../services/TrackerService';

const tracker = ref(null);
const props = defineProps<{
  id: string
}>();

onMounted(() => {
  getTracker(props.id)
    .then(theTracker => tracker.value = theTracker)
    .catch(err => console.error(err));
});
</script>

<template>
  <main>
    <TrackerDetails v-if="tracker" :tracker="tracker" />
  </main>
</template>
