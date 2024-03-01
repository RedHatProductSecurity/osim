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

const shouldShowWorkflowButtons = computed(
  () => ![DONE_STATUS, REJECTED_STATUS].includes(props.classification.state),
);

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
  <div class="osim-workflow-status-container mb-3">
    <LabelDiv label="Status" type="text" class="osim-workflow-status-display">
      <span class="form-control">{{ classification.state }}</span>
      <Modal :show="shouldShowRejectionModal" @close="closeModal">
        <template #title> Reject Flaw </template>
        <template #body>
          <label class="osim-modal-label mb-3">
            <span>Please provide a reason for rejecting the flaw</span>
            <textarea v-model="rejectionReason" class="form-control"></textarea>
          </label>
        </template>
        <template #footer>
          <button type="button" class="btn btn-primary" @click="onReject(flawId)">
            Reject Flaw
          </button>
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
        </template>
      </Modal>
    </LabelDiv>
    <div class="row">
      <div class="col-lg-3 col-md-1"></div>
      <div class="col-lg-9 col-md-11">
        <div v-if="shouldShowWorkflowButtons" class="osim-workflow-status-buttons mb-3">
          <button
            type="button"
            class="btn btn-warning ms-2 osim-workflow-button"
            @click="openModal"
          >
            Reject
          </button>
          <button
            type="button"
            class="btn btn-warning ms-2 osim-promote-button osim-workflow-button"
            :title="`Promote to ${nextPhase(classification.state as WorkflowPhases)}`"
            @click="onPromote(flawId)"
          >
            Promote to {{ nextPhase(classification.state as WorkflowPhases) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.osim-workflow-status-container {
  button.osim-workflow-button {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  label.osim-modal-label {
    display: block;
  }

  .osim-workflow-status-display {
    margin-bottom: 0 !important;
  }
}
</style>
