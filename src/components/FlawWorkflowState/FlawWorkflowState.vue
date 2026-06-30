<script setup lang="ts">
import { computed } from 'vue';

import type { z } from 'zod';

import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';
import type { ZodFlawClassification } from '@/types/zodShared';
import { FlawClassificationStateEnum } from '@/generated-client';

const props = defineProps<{
  classification: z.infer<typeof ZodFlawClassification>;
  labels?: null | ZodFlawLabelType[];
  shouldCreateJiraTask: boolean;
}>();

const emit = defineEmits<{ 'create:jiraTask': [] }>();

const workflowPrefix = computed(() => props.classification.workflow ?? null);
const stateValue = computed(() => props.classification.state || null);

const workflowLabels = computed(() =>
  (props.labels ?? []).filter(
    l => l.type === FlawLabelTypeEnum.WORKFLOW && l.relevant,
  ),
);

const shouldShowCreateJiraTaskButton = computed(
  () => props.classification.state === FlawClassificationStateEnum.Empty,
);

function toggleCreateJiraTask() {
  emit('create:jiraTask');
}
</script>

<template>
  <div class="osim-workflow-state-container mb-2">
    <LabelDiv label="State" class="osim-workflow-state-display mb-2">
      <div class="d-flex align-items-center gap-2">
        <span class="form-control osim-state-field">
          <template v-if="stateValue">
            <span class="osim-state-line">
              <span class="osim-workflow-prefix">State: <span class="osim-state-value">{{ stateValue }}</span></span>
              <span v-if="workflowPrefix" class="osim-workflow-prefix">
                / Workflow: <span class="osim-workflow-value">{{ workflowPrefix }}</span>
              </span>
            </span>
            <span v-if="workflowLabels.length" class="osim-badges-line">
              <span
                v-for="wfLabel in workflowLabels"
                :key="wfLabel.label"
                class="badge osim-workflow-label-badge me-1"
                title="workflow label"
              >{{ wfLabel.label }}</span>
            </span>
          </template>
          <template v-else>Legacy Flaw without Jira task</template>
        </span>
        <div v-if="shouldShowCreateJiraTaskButton" class="flex-shrink-0">
          <button
            type="button"
            class="btn btn-warning osim-last-field-button"
            title="Creates Jira task when flaw is saved"
            @click="toggleCreateJiraTask"
          >
            <i :class="{ 'bi-square': !shouldCreateJiraTask, 'bi-check-square': shouldCreateJiraTask }" />
            Create Jira task
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

  .osim-state-field {
    flex: 1 1 auto;
    width: auto;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .osim-state-line {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
  }

  .osim-state-value {
    font-weight: 600;
  }

  .osim-workflow-prefix {
    color: #000;
    font-size: 0.85em;

    .osim-state-value,
    .osim-workflow-value {
      font-weight: 600;
      color: #000;
    }
  }

  .osim-badges-line {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .osim-workflow-label-badge {
    font-size: 0.75em;
    font-weight: 500;
    background-color: #6c757d;
    color: #fff;
    border-radius: 0.25rem !important;
  }
}
</style>
