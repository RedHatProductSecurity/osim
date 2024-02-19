<script setup lang="ts">
import { ref, computed } from 'vue';
import { promoteFlaw, rejectFlaw } from '@/services/FlawService';
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import Modal from '@/components/widgets/Modal.vue';
import { ZodFlawClassification } from '@/types/zodFlaw';

const props = defineProps<{
  flawId: string;
  classification: any;
}>();

const emit = defineEmits<{ 'refresh:flaw': [] }>();

const shouldShowRejectionModal = ref(false);
const rejectionReason = ref('');

const workflowStatuses = ZodFlawClassification.shape.state.enum;

type WorkflowPhases = typeof workflowStatuses[keyof typeof workflowStatuses];

const DONE_STATUS = workflowStatuses.Done as string;
const REJECTED_STATUS = workflowStatuses.Rejected as string;

const shouldShowWorkflowButtons = computed(
  () => ![DONE_STATUS, REJECTED_STATUS].includes(props.classification.state)
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
  <div class="d-flex">
    <LabelStatic label="Status" type="text" :modelValue="classification.state">
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
    <div v-if="shouldShowWorkflowButtons" class="mt-4">
      <button
        @click="openModal"
        type="button"
        class="btn btn-warning mt-2 ms-2"
      >
        Reject
      </button>
      <button
        type="button"
        class="btn btn-warning mt-2 ms-2 osim-promote-button"
        :title="`Promote to ${nextPhase(classification.state as WorkflowPhases)}`"
        @click="onPromote(flawId)"
      >
        Promote to {{ nextPhase(classification.state as WorkflowPhases) }}
      </button>
    </div>
  </div>
</template>

<style scoped>

.osim-promote-button {
  max-width: 12rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.d-flex :deep(.osim-static-label){
  flex-grow: 1;
}

.d-flex button{
  flex-grow: 1;
}

label.osim-modal-label {
  display: block;
}
</style>
