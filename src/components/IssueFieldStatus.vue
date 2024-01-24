<script setup lang="ts">
import { ref, toRefs } from 'vue';
import { promoteFlaw, rejectFlaw } from '@/services/FlawService';
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import Modal from '@/components/widgets/Modal.vue';
import { WorkflowPhases } from '@/types/zodFlaw';
import { useField } from 'vee-validate';

const props =
  defineProps<{
    flawId: string;
  }>()
const { flawId } = toRefs(props);

const shouldShowRejectionModal = ref(false);
const rejectionReason = ref('');
const { value: flawStatus } = useField<string>('classification.state');

function openModal() {
  shouldShowRejectionModal.value = true;
}

function closeModal() {
  shouldShowRejectionModal.value = false;
}

function onSave() {
  closeModal();
  rejectFlaw(flawId.value, { reason: rejectionReason.value });
}

function nextPhase(flawStatus: WorkflowPhases) {
  const [labels, phases] = [
    Object.keys(WorkflowPhases),
    Object.values(WorkflowPhases),
  ];
  const index = phases.indexOf(flawStatus);
  return labels[index + 1] || labels.slice(-1)[0];
}

</script>

<template>
  <LabelStatic label="Status" type="text" v-model="flawStatus">
    <div>
      <button @click="shouldShowRejectionModal = true" class="btn btn-warning p-0 pe-1 ps-1 me-2"
        id="osim-status-reject-button" v-if="flawStatus.toUpperCase() !== 'DONE'">
        Reject
      </button>
      <button @click="promoteFlaw(flawId)" class="btn btn-warning p-0 pe-1 ps-1" id="osim-status-promote-button"
        v-if="flawStatus.toUpperCase() !== 'DONE'">
        Promote to {{ nextPhase(flawStatus as WorkflowPhases) }}
      </button>
    </div>
    <Modal :show="shouldShowRejectionModal" @close="closeModal">
      <template #title> Reject Flaw </template>
      <template #body>
        <LabelTextarea label="Please provide a reason for rejecting the flaw." type="text" v-model="rejectionReason" />
      </template>
      <template #footer>
        <button type="button" class="btn btn-primary" @click="onSave">
          Reject Flaw
        </button>
        <button type="button" class="btn btn-secondary" @click="closeModal">
          Cancel
        </button>
      </template>
    </Modal>
  </LabelStatic>
</template>

<style scoped>
label.osim-input {
  padding-left: 0 !important;
  border-left: none !important;
}
</style>