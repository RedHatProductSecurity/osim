<script setup lang="ts">
import { computed, ref } from 'vue';

import IncidentRequestDialog from './IncidentRequestDialog.vue';

const props = defineProps<{
  flawUuid: string;
  majorIncidentState: null | string | undefined;
  mode: 'create' | 'edit';
}>();

const emit = defineEmits<{
  requestSubmitted: [];
}>();

const showModal = ref(false);

const canRequest = computed(() =>
  props.mode === 'edit'
  && props.flawUuid
  && !props.majorIncidentState,
);

function openDialog() {
  showModal.value = true;
}

function closeDialog() {
  showModal.value = false;
}

function handleSubmitted() {
  emit('requestSubmitted');
}
</script>

<template>
  <button
    v-if="canRequest"
    type="button"
    class="btn btn-secondary btn-sm osim-incident-request-btn
      position-absolute end-0 bottom-0 border-start-0 rounded-start-0"
    @click="openDialog"
  >
    Request Incident
  </button>

  <IncidentRequestDialog
    :showModal="showModal"
    :flawId="flawUuid"
    @hideModal="closeDialog"
    @requestSubmitted="handleSubmitted"
  />
</template>

<style scoped>
.osim-incident-request-btn {
  height: 38px;
}
</style>
