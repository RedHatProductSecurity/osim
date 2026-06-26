<script setup lang="ts">
import { computed } from 'vue';
import type { z } from 'zod';

import LabelDiv from '@/widgets/LabelDiv/LabelDiv.vue';
import type { ZodFlawClassification } from '@/types/zodShared';

const props = defineProps<{
  classification: z.infer<typeof ZodFlawClassification>;
  shouldCreateJiraTask: boolean;
}>();

const emit = defineEmits<{ 'create:jiraTask': [] }>();

const EMPTY_STATE = 'EMPTY';

const workflowStateLabel = computed(() => {
  const { workflow, state } = props.classification;
  if (!state) return 'Legacy Flaw without Jira task';
  return workflow ? `${workflow} / ${state}` : state;
});

const shouldShowCreateJiraTaskButton = computed(
  () => props.classification.state === EMPTY_STATE,
);

function toggleCreateJiraTask() {
  emit('create:jiraTask');
}
</script>

<template>
  <div class="osim-workflow-state-container mb-2">
    <LabelDiv label="State" class="osim-workflow-state-display mb-2">
      <div class="d-flex align-items-center gap-2">
        <span class="form-control osim-state-field">{{ workflowStateLabel }}</span>
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
  }
}
</style>
