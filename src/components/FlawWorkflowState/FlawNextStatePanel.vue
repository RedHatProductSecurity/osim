<script setup lang="ts">
import { onMounted } from 'vue';

import { useWorkflowNextState, type WorkflowRequirement } from '@/composables/useWorkflowNextState';

import { isWorkflowCondition } from '@/services/WorkflowService';

const props = defineProps<{ flawUuid: string }>();

const {
  allRequirementsMet,
  error,
  fetchNextState,
  isLoading,
  nextState,
  satisfiedRequirements,
  unsatisfiedRequirements,
} = useWorkflowNextState(props.flawUuid);

onMounted(fetchNextState);

type BoolOp = 'AND' | 'OR';
const CONDITION_LABELS: Record<BoolOp, string> = {
  AND: 'All of:',
  OR: 'Any of:',
};

function requirementLabel(req: WorkflowRequirement): string {
  if (isWorkflowCondition(req)) {
    return CONDITION_LABELS[req.condition.toUpperCase() as BoolOp] ?? req.condition;
  }
  return req.name;
}
</script>

<template>
  <div class="osim-next-state-panel mt-2">
    <div v-if="isLoading" class="osim-next-state-loading">
      <span class="spinner-border spinner-border-sm me-1" role="status" />
      Loading…
    </div>
    <div v-else-if="error" class="osim-next-state-error">
      <i class="bi bi-exclamation-circle me-1" />{{ error }}
    </div>
    <div v-else-if="!nextState" class="osim-next-state-empty text-muted fst-italic">
      No further states — flaw is at the end of its workflow.
    </div>
    <template v-else>
      <div class="osim-next-state-header">
        <span class="osim-next-state-label">Next state:</span>
        <span class="badge rounded-pill osim-next-state-badge ms-1">
          {{ nextState.name }}
        </span>
        <span v-if="allRequirementsMet" class="osim-next-state-ready ms-2">
          <i class="bi bi-check-circle-fill text-success" /> All requirements met
        </span>
      </div>

      <ul v-if="unsatisfiedRequirements.length" class="osim-requirements-list mt-1">
        <li
          v-for="(req, index) in unsatisfiedRequirements"
          :key="`${requirementLabel(req)}-${index}`"
          class="osim-requirement osim-requirement--unmet"
        >
          <i class="bi bi-x-circle-fill me-1 text-danger" />
          <span>{{ requirementLabel(req) }}</span>
          <ul v-if="isWorkflowCondition(req)" class="osim-requirements-list mt-1">
            <li
              v-for="(child, childIndex) in req.requirements"
              :key="`${requirementLabel(child)}-${childIndex}`"
              class="osim-requirement"
              :class="child.accepts ? 'osim-requirement--met' : 'osim-requirement--unmet'"
            >
              <i
                class="me-1"
                :class="child.accepts
                  ? 'bi bi-check-circle-fill text-success'
                  : 'bi bi-x-circle-fill text-danger'"
              />
              {{ requirementLabel(child) }}
            </li>
          </ul>
        </li>
      </ul>

      <ul v-if="satisfiedRequirements.length" class="osim-requirements-list mt-1">
        <li
          v-for="(req, index) in satisfiedRequirements"
          :key="`${requirementLabel(req)}-${index}`"
          class="osim-requirement osim-requirement--met"
        >
          <i class="bi bi-check-circle-fill me-1 text-success" />
          <span>{{ requirementLabel(req) }}</span>
          <ul v-if="isWorkflowCondition(req)" class="osim-requirements-list mt-1">
            <li
              v-for="(child, childIndex) in req.requirements"
              :key="`${requirementLabel(child)}-${childIndex}`"
              class="osim-requirement"
              :class="child.accepts ? 'osim-requirement--met' : 'osim-requirement--unmet'"
            >
              <i
                class="me-1"
                :class="child.accepts
                  ? 'bi bi-check-circle-fill text-success'
                  : 'bi bi-x-circle-fill text-danger'"
              />
              {{ requirementLabel(child) }}
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.osim-next-state-panel {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0 0.375rem 0.375rem 0;
}

.osim-next-state-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-weight: 500;
}

.osim-next-state-label {
  color: #6c757d;
  font-weight: normal;
}

.osim-next-state-badge {
  font-size: 0.8em;
  background-color: #f1f3f5;
  color: #212529;
  border: 1px solid #212529;
}

.osim-next-state-ready {
  font-size: 0.85em;
  color: #198754;
}

.osim-next-state-loading,
.osim-next-state-error,
.osim-next-state-empty {
  font-size: 0.875rem;
}

.osim-requirements-list {
  list-style: none;
  padding-left: 0.5rem;
  margin-bottom: 0;

  .osim-requirement {
    padding: 0.1rem 0;
  }

  // nested list indent
  .osim-requirements-list {
    padding-left: 1.25rem;
  }
}
</style>
