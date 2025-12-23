import { mountWithConfig } from '@/__tests__/helpers';

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
    expect(wrapper.emitted('save')).toEqual([[expect.objectContaining({ label: 'test' })]]);
  });
});
