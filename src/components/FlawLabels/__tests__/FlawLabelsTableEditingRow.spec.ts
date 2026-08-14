import { mountWithConfig } from '@/__tests__/helpers';
import { FlawLabelTypeEnum } from '@/types/zodFlaw';
import { StateEnum } from '@/generated-client';

import FlawLabelTableEditingRow from '../FlawLabelTableEditingRow.vue';

describe('flawLabelsTableEditingRow', () => {
  it('should render', () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, { shallow: true });

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should not emit save event if nothing changed', async () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow);

    await wrapper.find('button[title="Save"]').trigger('click');

    expect(wrapper.emitted()).not.toHaveProperty('save');
    expect(wrapper.emitted()).toHaveProperty('cancel');
  });

  it('should emit save event if value changed', async () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        contextLabels: ['test'],
      },
    });

    // Select index: 0 = State, 1 = Type, 2 = Label
    await wrapper.findAll('select')[2].setValue('test');
    await wrapper.find('button[title="Save"]').trigger('click');

    expect(wrapper.emitted()).toHaveProperty('save');
    expect(wrapper.emitted('save')).toEqual([[expect.objectContaining({ name: 'test' })]]);
  });

  it('should save an updated contributor instead of reverting it', async () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        initalLabel: {
          type: FlawLabelTypeEnum.CONTEXT_BASED,
          name: 'test',
          contributor: 'skynet',
          state: StateEnum.New,
        },
      },
    });

    await wrapper.find('input').setValue('agent-smith');
    await wrapper.find('input').trigger('blur');
    await wrapper.find('button[title="Save"]').trigger('click');

    expect(wrapper.emitted()).not.toHaveProperty('cancel');
    expect(wrapper.emitted()).toHaveProperty('save');
    expect(wrapper.emitted('save')).toEqual([[expect.objectContaining({ contributor: 'agent-smith' })]]);
  });
});
