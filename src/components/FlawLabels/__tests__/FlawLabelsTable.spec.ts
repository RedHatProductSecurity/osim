import { flushPromises } from '@vue/test-utils';

import { useFlawLabels } from '@/composables/useFlawLabels';

import { mountWithConfig } from '@/__tests__/helpers';
import { FlawLabelTypeEnum } from '@/types/zodFlaw';
import { StateEnum } from '@/generated-client';

import FlawLabelsTable from '../FlawLabelsTable.vue';
import FlawLabelTableEditingRow from '../FlawLabelTableEditingRow.vue';

vi.mock('@/services/LabelsService', () => ({
  fetchLabels: vi.fn().mockResolvedValue([
    { type: 'context_based', name: 'test' },
    { type: 'context_based', name: 'test1' },
  ]),
}));

const mountFlawLabelsTable = (props = {}) => mountWithConfig(FlawLabelsTable, {
  props: {
    modelValue: [
      { type: FlawLabelTypeEnum.CONTEXT_BASED, label: 'test', contributor: 'skynet', state: StateEnum.New },
    ],
    ...props,
  },
});

describe('flawLabelsTable', () => {
  it('should render flaw labels table', async () => {
    const wrapper = mountFlawLabelsTable();
    await flushPromises();

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should handle add label', async () => {
    const wrapper = mountFlawLabelsTable();
    const { areLabelsUpdated } = useFlawLabels();
    await flushPromises();

    await wrapper.find('.table-new-row td').trigger('click');
    const editRow = wrapper.findComponent(FlawLabelTableEditingRow);
    editRow.vm.$emit('save', {
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      label: 'test1',
      contributor: 'skynet',
      state: StateEnum.New,
    });
    await flushPromises();

    expect(areLabelsUpdated.value).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should handle edit label', async () => {
    const wrapper = mountFlawLabelsTable();
    const { areLabelsUpdated } = useFlawLabels();
    await flushPromises();

    await wrapper.find('button[title="Edit label"]').trigger('click');
    const editRow = wrapper.findComponent(FlawLabelTableEditingRow);
    editRow.vm.$emit('save', {
      type: FlawLabelTypeEnum.CONTEXT_BASED,
      label: 'test1',
      contributor: 'skynet',
      state: StateEnum.New,
    });
    await flushPromises();

    expect(areLabelsUpdated.value).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should handle delete label', async () => {
    const wrapper = mountFlawLabelsTable();
    const { areLabelsUpdated } = useFlawLabels();
    await flushPromises();

    await wrapper.find('button[title="Delete label"]').trigger('click');
    await flushPromises();

    expect(areLabelsUpdated.value).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should handle undo delete label', async () => {
    const wrapper = mountFlawLabelsTable();
    const { areLabelsUpdated } = useFlawLabels();
    await flushPromises();

    await wrapper.find('button[title="Delete label"]').trigger('click');
    await flushPromises();

    await wrapper.find('button[title="Undo delete"]').trigger('click');
    await flushPromises();

    expect(areLabelsUpdated.value).toBe(false);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
