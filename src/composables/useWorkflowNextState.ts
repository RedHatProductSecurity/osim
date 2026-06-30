import { computed, ref } from 'vue';

import {
  getFlawWorkflowClassification,
  type WorkflowRequirement,
  type WorkflowStateDetail,
} from '@/services/WorkflowService';

export function useWorkflowNextState(flawUuid: string) {
  const isLoading = ref(false);
  const error = ref<null | string>(null);
  const nextState = ref<null | WorkflowStateDetail>(null);
  const isFetched = ref(false);

  const unsatisfiedRequirements = computed(() =>
    (nextState.value?.requirements ?? []).filter(req => !req.accepts),
  );

  const satisfiedRequirements = computed(() =>
    (nextState.value?.requirements ?? []).filter(req => req.accepts),
  );

  const allRequirementsMet = computed(() => nextState.value?.accepts ?? false);

  async function fetchNextState() {
    if (isFetched.value) return;
    isLoading.value = true;
    error.value = null;
    try {
      const data = await getFlawWorkflowClassification(flawUuid);
      const { state, workflow } = data.classification;
      const currentWorkflow = data.workflows.find(w => w.name === workflow);
      if (!currentWorkflow) {
        error.value = 'Current workflow not found';
        return;
      }
      const currentIndex = currentWorkflow.states.findIndex(s => s.name === state);
      nextState.value = currentIndex >= 0 && currentIndex < currentWorkflow.states.length - 1
        ? currentWorkflow.states[currentIndex + 1]
        : null;
      isFetched.value = true;
    } catch {
      error.value = 'Failed to load next state requirements';
    } finally {
      isLoading.value = false;
    }
  }

  return {
    allRequirementsMet,
    error,
    fetchNextState,
    isLoading,
    nextState,
    satisfiedRequirements,
    unsatisfiedRequirements,
  };
}

export type { WorkflowRequirement };
