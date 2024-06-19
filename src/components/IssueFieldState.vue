<script setup lang="ts">
import { ref, computed } from 'vue';
import { promoteFlaw, rejectFlaw } from '@/services/FlawService';
import LabelDiv from '@/components/widgets/LabelDiv.vue';
import Modal from '@/components/widgets/Modal.vue';
import { ZodFlawClassification } from '@/types/zodShared';

const props = defineProps<{
  flawId: string;
  classification: any;
}>();

const emit = defineEmits<{ 'refresh:flaw': [] }>();

const shouldShowRejectionModal = ref(false);
const rejectionReason = ref('');

const workflowStates = ZodFlawClassification.shape.state.enum;

type WorkflowPhases = (typeof workflowStates)[keyof typeof workflowStates];

const DONE_STATE = workflowStates.Done as string;
const REJECTED_STATE = workflowStates.Rejected as string;
const EMPTY_STATE = workflowStates.Empty as string;

const shouldShowWorkflowButtons = computed(
  () => ![DONE_STATE, REJECTED_STATE,EMPTY_STATE].includes(props.classification.state),
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

function nextPhase(workflowState: WorkflowPhases) {
  const [labels, phases] = [Object.keys(workflowStates), Object.values(workflowStates)];
  const index = phases.indexOf(workflowState);
  return labels[index + 1] || labels.slice(-1)[0];
}
</script>

<template>
  <div class="osim-workflow-state-container mb-3">
    <LabelDiv label="State" type="text" class="osim-workflow-state-display">
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
        <div v-if="shouldShowWorkflowButtons" class="osim-workflow-state-buttons mb-3">
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
.osim-workflow-state-container {
  button.osim-workflow-button {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  label.osim-modal-label {
    display: block;
  }

  .osim-workflow-state-display {
    margin-bottom: 0 !important;
  }

  span.form-control {
    min-height: 38px;
  }
}
</style>
