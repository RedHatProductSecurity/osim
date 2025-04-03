import { mount } from '@vue/test-utils';
import { acknowledgments } from '@test-fixtures/sampleFlawFull.json';

import IssueFieldAcknowledgments from '@/components/IssueFieldAcknowledgments/IssueFieldAcknowledgments.vue';

import type { ZodFlawAcknowledgmentType } from '@/types/zodFlaw';

const mountIssueFieldAcknowledgments =
(mode: InstanceType<typeof IssueFieldAcknowledgments>['$props']['mode'] = 'edit') => mount(IssueFieldAcknowledgments, {
  props: {
    mode,
    error: null,
    modelValue: acknowledgments as ZodFlawAcknowledgmentType[],
  },
});

describe('issueFieldAcknowledgements', () => {
  it.each<InstanceType<typeof IssueFieldAcknowledgments>['$props']['mode']>(['edit', 'create'])(
    'should render the acknowledgements field in %s mode', (mode) => {
      const wrapper = mountIssueFieldAcknowledgments(mode);

      expect(wrapper.html()).toMatchSnapshot();
    });

  it.each([
    ['create', 'form .btn-secondary', 'acknowledgment:new'],
    ['update', 'form .btn-primary', 'acknowledgment:update'],
  ])('should emit an event on %s', async (name, selector, event) => {
    const wrapper = mountIssueFieldAcknowledgments();

    await wrapper.find(selector).trigger('click');
    expect(wrapper.emitted(event)).toBeTruthy();
  });

  it('should emit an event on delete', async () => {
    const wrapper = mountIssueFieldAcknowledgments();

    await wrapper.findAll('.buttons button')[1].trigger('click');
    await wrapper.find('.modal .btn-danger').trigger('click');

    expect(wrapper.emitted()).toHaveProperty('acknowledgment:delete');
  });
});
