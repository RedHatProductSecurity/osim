<script setup lang="ts">
import { ref, computed } from 'vue';
import { promoteFlaw, rejectFlaw } from '@/services/FlawService';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
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

type WorkflowPhases = (typeof workflowStatuses)[keyof typeof workflowStatuses];

const DONE_STATUS = workflowStatuses.Done as string;
const REJECTED_STATUS = workflowStatuses.Rejected as string;

const shouldShowWorkflowButtons = computed(() => ![DONE_STATUS, REJECTED_STATUS].includes(props.classification.state));

function openModal() {
  shouldShowRejectionModal.value = true;
}

function closeModal() {
  shouldShowRejectionModal.value = false;
}

function onReject(flawId: string) {
  closeModal();
  rejectFlaw(flawId, { reason: rejectionReason.value }).then(() => emit('refresh:flaw'));
}

function onPromote(flawId: string) {
  promoteFlaw(flawId).then(() => emit('refresh:flaw'));
}

function nextPhase(flawStatus: WorkflowPhases) {
  const [labels, phases] = [Object.keys(workflowStatuses), Object.values(workflowStatuses)];
  const index = phases.indexOf(flawStatus);
  return labels[index + 1] || labels.slice(-1)[0];
}
</script>

<template>
  <LabelDiv label="Status" type="text">
    <div class="row">
      <div class="col-4">

        <span class="form-control">{{ classification.state }}</span>
      </div>
      <div v-if="shouldShowWorkflowButtons" class="col-8">
        <button type="button" class="btn btn-warning ms-2" @click="openModal">Reject</button>
        <button
          type="button"
          class="btn btn-warning ms-2 osim-promote-button"
          :title="`Promote to ${nextPhase(classification.state as WorkflowPhases)}`"
          @click="onPromote(flawId)"
        >
          Promote to {{ nextPhase(classification.state as WorkflowPhases) }}
        </button>
      </div>
    </div>
    <Modal :show="shouldShowRejectionModal" @close="closeModal">
      <template #title> Reject Flaw </template>
      <template #body>
        <label class="osim-modal-label mb-3">
          <p>Please provide a reason for rejecting the flaw</p>
          <textarea v-model="rejectionReason" class="form-control"></textarea>
        </label>
      </template>
      <template #footer>
        <button type="button" class="btn btn-primary" @click="onReject(flawId)">Reject Flaw</button>
        <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
      </template>
    </Modal>
  </LabelDiv>
</template>

<style scoped>
.osim-classification-label {
  white-space: nowrap;
  
}

.osim-promote-button {
  max-width: 12rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.d-flex :deep(.osim-static-label) {
  flex-grow: 1;
}

.d-flex button {
  flex-grow: 1;
}

label.osim-modal-label {
  display: block;
}
</style>
