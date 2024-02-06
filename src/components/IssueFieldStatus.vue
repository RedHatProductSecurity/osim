<script setup lang="ts">
import { ref, computed } from 'vue';
import { promoteFlaw, rejectFlaw } from '@/services/FlawService';
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import Modal from '@/components/widgets/Modal.vue';
import { useField } from 'vee-validate';
import { ZodFlawClassification } from '@/types/zodFlaw';

defineProps<{
  flawId: string;
}>();

const emit = defineEmits<{ 'refresh:flaw': [] }>();

const shouldShowRejectionModal = ref(false);
const rejectionReason = ref('');
const { value: flawStatus } = useField<string>('classification.state');

const workflowStatuses = ZodFlawClassification.shape.state.enum;

type WorkflowPhases = typeof workflowStatuses[keyof typeof workflowStatuses];

const DONE_STATUS = workflowStatuses.Done as string;
const REJECTED_STATUS = workflowStatuses.Rejected as string;

const shouldShowWorkflowButtons = computed(
  () => ![DONE_STATUS, REJECTED_STATUS].includes(flawStatus.value)
);

function openModal() {
  shouldShowRejectionModal.value = true;
}

function closeModal() {
  shouldShowRejectionModal.value = false;
}

function onReject(flawId: string) {
  closeModal();
  rejectFlaw(flawId, { reason: rejectionReason.value })
    .then(() => emit('refresh:flaw'));
}

function onPromote(flawId: string) {
  promoteFlaw(flawId).then(() => emit('refresh:flaw'));
}

function nextPhase(flawStatus: WorkflowPhases) {
  const [labels, phases] = [
    Object.keys(workflowStatuses),
    Object.values(workflowStatuses),
  ];
  const index = phases.indexOf(flawStatus);
  return labels[index + 1] || labels.slice(-1)[0];
}
</script>

<template>
  <LabelStatic label="Status" type="text" v-model="flawStatus">
    <div>
      <button
        @click="openModal"
        class="btn btn-warning p-0 pe-1 ps-1 me-2"
        id="osim-status-reject-button"
        v-if="shouldShowWorkflowButtons"
      >
        Reject
      </button>
      <button
        @click="onPromote(flawId)"
        class="btn btn-warning p-0 pe-1 ps-1"
        id="osim-status-promote-button"
        v-if="shouldShowWorkflowButtons"
      >
        Promote to {{ nextPhase(flawStatus as WorkflowPhases) }}
      </button>
    </div>
    <Modal :show="shouldShowRejectionModal" @close="closeModal">
      <template #title> Reject Flaw </template>
      <template #body>
        <label class="osim-modal-label mb-3">
          <p>Please provide a reason for rejecting the flaw</p>
          <textarea class="form-control" v-model="rejectionReason"></textarea>
        </label>
      </template>
      <template #footer>
        <button type="button" class="btn btn-primary" @click="onReject(flawId)">
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
label.osim-modal-label {
  display: block;
}
</style>