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

const workflowStateLabel = computed(() => {
  const { state, workflow } = props.classification;
  if (!state) return 'Legacy Flaw without Jira task';
  return workflow ? `${workflow} / ${state}` : state;
});

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
          {{ workflowStateLabel }}
          <span
            v-for="wfLabel in workflowLabels"
            :key="wfLabel.label"
            class="badge osim-workflow-label-badge ms-1"
            title="workflow label"
          >{{ wfLabel.label }}</span>
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
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .osim-workflow-label-badge {
    font-size: 0.75em;
    font-weight: 500;
    background-color: #6c757d;
    color: #fff;
  }
}
</style>
