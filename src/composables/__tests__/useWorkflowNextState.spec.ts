import { useWorkflowNextState } from '@/composables/useWorkflowNextState';

import { getFlawWorkflowClassification } from '@/services/WorkflowService';

vi.mock('@/services/WorkflowService');

const baseWorkflow = {
  accepts: true,
  conditions: [],
  description: '',
  name: 'Default',
  priority: 1,
  states: [
    { accepts: true, name: 'NEW', requirements: [] },
    { accepts: false, name: 'DONE', requirements: [] },
  ],
};

const mockData = (state: string, workflow = 'Default') => ({
  classification: { state, workflow },
  flaw: 'uuid',
  workflows: [baseWorkflow],
});

describe('useWorkflowNextState', () => {
  it('resolves next state', async () => {
    vi.mocked(getFlawWorkflowClassification).mockResolvedValue(mockData('NEW'));
    const { error, fetchNextState, nextState } = useWorkflowNextState('uuid');

    await fetchNextState();

    expect(error.value).toBeNull();
    expect(nextState.value?.name).toBe('DONE');
  });

  it('returns null for terminal state', async () => {
    vi.mocked(getFlawWorkflowClassification).mockResolvedValue(mockData('DONE'));
    const { fetchNextState, nextState } = useWorkflowNextState('uuid');

    await fetchNextState();

    expect(nextState.value).toBeNull();
  });

  it('sets error when workflow not found', async () => {
    vi.mocked(getFlawWorkflowClassification).mockResolvedValue(mockData('NEW', 'Unknown'));
    const { error, fetchNextState } = useWorkflowNextState('uuid');

    await fetchNextState();

    expect(error.value).toBe('Current workflow not found');
  });

  it('sets error when state not found in workflow', async () => {
    vi.mocked(getFlawWorkflowClassification).mockResolvedValue(mockData('INVALID'));
    const { error, fetchNextState } = useWorkflowNextState('uuid');

    await fetchNextState();

    expect(error.value).toContain('Unknown state "INVALID"');
  });

  it('sets error on fetch failure', async () => {
    vi.mocked(getFlawWorkflowClassification).mockRejectedValue(new Error('Network error'));
    const { error, fetchNextState } = useWorkflowNextState('uuid');

    await fetchNextState();

    expect(error.value).toBe('Failed to load next state requirements');
  });
});
