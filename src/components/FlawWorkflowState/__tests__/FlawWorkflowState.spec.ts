import { mountWithConfig } from '@/__tests__/helpers';
import { FlawLabelTypeEnum } from '@/types/zodFlaw';

import FlawWorkflowState from '../FlawWorkflowState.vue';

describe('flawWorkflowState', () => {
  it('should display workflow labels without relevant field', () => {
    const wrapper = mountWithConfig(FlawWorkflowState, {
      props: {
        flawUuid: 'test-uuid',
        shouldCreateJiraTask: false,
        classification: { workflow: 'DEFAULT', state: 'NEW' },
        labels: [
          { type: FlawLabelTypeEnum.WORKFLOW, name: 'wf-label-1' },
          { type: FlawLabelTypeEnum.WORKFLOW, name: 'wf-label-2' },
        ],
      },
    });

    const badges = wrapper.findAll('.osim-workflow-label-badge');
    expect(badges.length).toBe(2);
    expect(badges[0].text()).toBe('wf-label-1');
    expect(badges[1].text()).toBe('wf-label-2');
  });

  it('should not display non-workflow labels', () => {
    const wrapper = mountWithConfig(FlawWorkflowState, {
      props: {
        flawUuid: 'test-uuid',
        shouldCreateJiraTask: false,
        classification: { workflow: 'DEFAULT', state: 'NEW' },
        labels: [
          { type: FlawLabelTypeEnum.CONTEXT_BASED, name: 'ctx-label' },
          { type: FlawLabelTypeEnum.ALIAS, name: 'alias-label' },
        ],
      },
    });

    const badges = wrapper.findAll('.osim-workflow-label-badge');
    expect(badges.length).toBe(0);
  });
});
