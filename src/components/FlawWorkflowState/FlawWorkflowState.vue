<script setup lang="ts">
import { computed, ref } from 'vue';

import { createLabel, deleteLabel } from '@/services/LabelsService';
import type { ZodFlawLabelType } from '@/types/zodFlaw';
import { ZodFlawClassification } from '@/types/zodShared';
import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import LoadingSpinner from '@/widgets/LoadingSpinner/LoadingSpinner.vue';

const props = defineProps<{
  classification: any;
  flawId: string;
  flawLabels: ZodFlawLabelType[];
  shouldCreateJiraTask: boolean;
}>();

const emit = defineEmits<{ 'create:jiraTask': []; 'refresh:flaw': [] }>();

const isRequesting = ref(false);

const workflowStates = ZodFlawClassification.shape.state.enum;

const EMPTY_STATE = workflowStates.Empty as string;
const NEW_STATE = workflowStates.New as string;
const TRIAGE_STATE = workflowStates.Triage as string;

const MANUAL_TRIAGE_LABEL = 'manual-triage';
const POTENTIAL_REJECTION_LABEL = 'potential-rejection';

const shouldShowCreateJiraTaskButton = computed(
  () => props.classification.state === EMPTY_STATE,
);

const hasManualTriageLabel = computed(() =>
  props.flawLabels.some(label => label.label === MANUAL_TRIAGE_LABEL),
);

const hasPotentialRejectionLabel = computed(() =>
  props.flawLabels.some(label => label.label === POTENTIAL_REJECTION_LABEL),
);

const canToggleManualTriage = computed(() => {
  return props.classification.state === NEW_STATE && !hasPotentialRejectionLabel.value;
});

const canTogglePotentialRejection = computed(() => {
  return props.classification.state === TRIAGE_STATE && !hasManualTriageLabel.value;
});

function toggleCreateJiraTask() {
  emit('create:jiraTask');
}

async function toggleLabel(labelName: string, shouldAdd: boolean) {
  isRequesting.value = true;

  try {
    if (shouldAdd) {
      // Note: Using 'context_based' type temporarily until backend defines 'workflow' type
      // TODO: Update to 'workflow' type when backend support is ready
      const newLabel: ZodFlawLabelType = {
        label: labelName,
        state: 'REQ' as any, // Using REQ state for workflow labels
        relevant: true,
        type: 'context_based' as any, // Temporary - will be 'workflow' when backend ready
        contributor: undefined,
      };
      await createLabel(props.flawId, newLabel);
    } else {
      const existingLabel = props.flawLabels.find(label => label.label === labelName);
      if (existingLabel) {
        await deleteLabel(props.flawId, existingLabel);
      }
    }
    emit('refresh:flaw');
  } catch (error) {
    console.error(`Error toggling label ${labelName}:`, error);
  } finally {
    isRequesting.value = false;
  }
}

function onToggleManualTriage() {
  toggleLabel(MANUAL_TRIAGE_LABEL, !hasManualTriageLabel.value);
}

function onTogglePotentialRejection() {
  toggleLabel(POTENTIAL_REJECTION_LABEL, !hasPotentialRejectionLabel.value);
}
</script>

<template>
  <div class="osim-workflow-state-container mb-2">
    <LabelDiv label="State" class="osim-workflow-state-display mb-2">
      <div class="d-flex position-relative">
        <span class="form-control rounded-0 osim-workflow-state-field">
          {{ classification.state || 'Legacy Flaw without Jira task' }}
        </span>
        <div v-if="shouldShowCreateJiraTaskButton" class="osim-workflow-state-buttons">
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
        <div v-else class="osim-workflow-label-buttons">
          <button
            v-if="canToggleManualTriage"
            type="button"
            class="btn btn-sm osim-workflow-label-btn"
            :class="hasManualTriageLabel ? 'btn-success' : 'btn-secondary'"
            :disabled="isRequesting"
            :title="hasManualTriageLabel ? 'Remove manual-triage label' : 'Add manual-triage label'"
            @click="onToggleManualTriage"
          >
            <LoadingSpinner v-if="isRequesting" type="border" />
            <i v-else :class="hasManualTriageLabel ? 'bi-check-circle-fill' : 'bi-circle'" />
            Manual Triage
          </button>
          <button
            v-if="canTogglePotentialRejection"
            type="button"
            class="btn btn-sm osim-workflow-label-btn"
            :class="hasPotentialRejectionLabel ? 'btn-warning' : 'btn-secondary'"
            :disabled="isRequesting"
            :title="hasPotentialRejectionLabel ? 'Remove potential-rejection label' : 'Add potential-rejection label'"
            @click="onTogglePotentialRejection"
          >
            <LoadingSpinner v-if="isRequesting" type="border" />
            <i v-else :class="hasPotentialRejectionLabel ? 'bi-check-circle-fill' : 'bi-circle'" />
            Potential Rejection
          </button>
        </div>
      </div>
    </LabelDiv>
  </div>
</template>

<style lang="scss" scoped>
.osim-workflow-state-container {
  .osim-workflow-state-display {
    margin-bottom: 0 !important;
  }

  .osim-workflow-state-field {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .osim-workflow-label-buttons {
    position: absolute;
    right: 0;
    bottom: 0;
    display: flex;
    gap: 0;

    button.osim-workflow-label-btn {
      height: 38px;
      border-left: 0;
      border-radius: 0;
      white-space: nowrap;

      &:last-child {
        border-top-right-radius: 0.375rem;
        border-bottom-right-radius: 0.375rem;
      }
    }
  }
}
</style>
