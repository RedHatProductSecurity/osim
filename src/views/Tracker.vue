<script lang="ts">
import FlawDetailView from '../views/FlawDetailView.vue';
import FlawView from '../views/FlawView.vue';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  components: {
    FlawDetailView,
    FlawView,
  },
  
  setup() {
    const selectedView = ref('issue');

    return {
      selectedView,
    };
  },
});
</script>
<template>
  <main>
    <div class="align-items-center mt-5 mt-5">
      <div class="d-flex justify-content-center mb-3">
        <button class="btn btn-primary me-3" @click="selectedView = 'issue'">Issue Details</button>
        <button class="btn btn-outline-primary" @click="selectedView = 'flaw'">Flaw Details</button>
      </div>
      <component :is="selectedView === 'issue' ? 'IssueView' : 'FlawView'" />
    </div>
  </main>
</template>
