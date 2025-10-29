<script setup lang="ts">
import { ref, computed } from 'vue';

import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import Modal from '@/widgets/Modal/Modal.vue';
import { promoteFlawWorkflow, rejectFlawWorkflow, resetFlawWorkflow, revertFlawWorkflow } from '@/services/FlawService';
import { ZodFlawClassification } from '@/types/zodShared';
import DropDownMenu from '@/widgets/DropDownMenu/DropDownMenu.vue';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  classification: any;
  flawId: string;
  shouldCreateJiraTask: boolean;
}>();

const emit = defineEmits<{ 'create:jiraTask': []; 'refresh:flaw': [] }>();

const shouldShowRejectionModal = ref(false);
const rejectionReason = ref('');
const isRequesting = ref(false);
const dropdownMenuRef = ref<InstanceType<typeof DropDownMenu>>();

const workflowStates = ZodFlawClassification.shape.state.enum;

type WorkflowPhases = (typeof workflowStates)[keyof typeof workflowStates];

const DONE_STATE = workflowStates.Done as string;
const REJECTED_STATE = workflowStates.Rejected as string;
const EMPTY_STATE = workflowStates.Empty as string;

const shouldShowWorkflowButtons = computed(
  () => ![DONE_STATE, EMPTY_STATE, REJECTED_STATE].includes(props.classification.state),
);

const shouldShowCreateJiraTaskButton = computed(
  () => props.classification.state === EMPTY_STATE,
);

function toggleCreateJiraTask() {
  emit('create:jiraTask');
}

function openRejectionModal() {
  shouldShowRejectionModal.value = true;
  dropdownMenuRef.value?.close();
}

function closeRejectionModal() {
  shouldShowRejectionModal.value = false;
}

function onReject(flawId: string) {
  isRequesting.value = true;
  closeRejectionModal();
  rejectFlawWorkflow(flawId, { reason: rejectionReason.value }).then(() => {
    emit('refresh:flaw');
  }).finally(() => {
    isRequesting.value = false;
  });
}

function onPromote(flawId: string) {
  dropdownMenuRef.value?.close();
  isRequesting.value = true;
  promoteFlawWorkflow(flawId).then(() => {
    emit('refresh:flaw');
  }).finally(() => {
    isRequesting.value = false;
  });
}

function nextPhase(workflowState: WorkflowPhases) {
  const [labels, phases] = [Object.keys(workflowStates), Object.values(workflowStates)];
  const index = phases.indexOf(workflowState);
  return labels[index + 1] || labels.slice(-1)[0];
}

function previousPhase(workflowState: WorkflowPhases) {
  const [labels, phases] = [Object.keys(workflowStates), Object.values(workflowStates)];
  const index = phases.indexOf(workflowState);
  return labels[index - 1] || labels[0];
}

async function onRevert(flawId: string) {
  dropdownMenuRef.value?.close();
  isRequesting.value = true;
  revertFlawWorkflow(flawId).then(() => {
    emit('refresh:flaw');
  }).finally(() => {
    isRequesting.value = false;
  });
}

async function onReset(flawId: string) {
  dropdownMenuRef.value?.close();
  isRequesting.value = true;
  resetFlawWorkflow(flawId).then(() => {
    emit('refresh:flaw');
  }).finally(() => {
    isRequesting.value = false;
  });
}
</script>

<template>
  <div class="osim-workflow-state-container mb-2">
    <LabelDiv label="State" class="osim-workflow-state-display mb-2">
      <div class="d-flex">
        <span class="form-control rounded-0">{{ classification.state || 'Legacy Flaw without Jira task' }}</span>
        <div class="col-auto">
          <div v-if="shouldShowWorkflowButtons" class="osim-workflow-state-buttons">
            <DropDownMenu ref="dropdownMenuRef">
              <template #trigger>
                <button type="button" class="btn btn-secondary dropdown-toggle" :disabled="isRequesting">
                  Change State
                  <LoadingSpinner v-if="isRequesting" type="grow" />
                </button>
              </template>
              <template #content>
                <div v-if="!isRequesting" class="workflow-dropdown-menu">
                  <li class="dropdown-item">
                    <button
                      type="button"
                      class="btn"
                      :title="`Promote to ${nextPhase(classification.state as WorkflowPhases)}`"
                      @click="onPromote(flawId)"
                    >
                      <i class="bi bi-chevron-double-right" />
                      Promote to {{ nextPhase(classification.state as WorkflowPhases) }}
                    </button>
                  </li>
                  <li class="dropdown-item">
                    <button
                      type="button"
                      class="btn"
                      @click="onRevert(flawId)"
                    >
                      <i class="bi bi-chevron-double-left" />
                      Revert to {{ previousPhase(classification.state as WorkflowPhases) }}
                    </button>
                  </li>
                  <li class="dropdown-item">
                    <button
                      type="button"
                      class="btn"
                      @click="openRejectionModal"
                    >
                      <i class="bi bi-chevron-bar-down"></i>
                      Reject
                    </button>
                  </li>
                  <li class="dropdown-item">
                    <button
                      type="button"
                      class="btn"
                      @click="onReset(flawId)"
                    >
                      <i class="bi bi-arrow-counterclockwise"></i>
                      Reset
                    </button>
                  </li>
                </div>
              </template>
            </DropDownMenu>
          </div>
          <div v-else-if="shouldShowCreateJiraTaskButton" class="osim-workflow-state-buttons">
            <button
              type="button"
              class="btn btn-warning osim-last-field-button"
              title="Creates Jira task when flaw is saved"
              @click="toggleCreateJiraTask"
            >
              <i
                :class="{ 'bi-square': !shouldCreateJiraTask, 'bi-check-square': shouldCreateJiraTask }"
              />
              Create Jira task
            </button>
          </div>
        </div>
      </div>
      <Modal :show="shouldShowRejectionModal" @close="closeRejectionModal">
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
          <button type="button" class="btn btn-secondary" @click="closeRejectionModal">Cancel</button>
        </template>
      </Modal>
    </LabelDiv>
  </div>
</template>

<style lang="scss" scoped>
.osim-workflow-state-container {
  label.osim-modal-label {
    display: block;
  }

  .osim-workflow-state-display {
    margin-bottom: 0 !important;
  }
}
</style>
