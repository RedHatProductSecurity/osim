import { osidbFetch } from '@/services/OsidbAuthService';

export type WorkflowCheck = {
  accepts: boolean;
  description: string;
  name: string;
};

export type WorkflowCondition = {
  accepts: boolean;
  condition: string;
  requirements: WorkflowRequirement[];
};

export type WorkflowRequirement = WorkflowCheck | WorkflowCondition;

export type WorkflowStateDetail = {
  accepts: boolean;
  name: string;
  requirements: WorkflowRequirement[];
};

export type WorkflowDetail = {
  accepts: boolean;
  conditions: WorkflowCheck[];
  description: string;
  name: string;
  priority: number;
  states: WorkflowStateDetail[];
};

export type VerboseWorkflowClassification = {
  classification: {
    state: string;
    workflow: string;
  };
  flaw: string;
  workflows: WorkflowDetail[];
};

export function isWorkflowCondition(req: WorkflowRequirement): req is WorkflowCondition {
  return 'condition' in req;
}

export async function getFlawWorkflowClassification(flawUuid: string): Promise<VerboseWorkflowClassification> {
  const { data } = await osidbFetch({
    method: 'get',
    url: `/workflows/api/v1/workflows/${flawUuid}`,
    params: { verbose: true },
  });
  return data as VerboseWorkflowClassification;
}
