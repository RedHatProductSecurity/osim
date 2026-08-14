import { mountWithConfig } from '@/__tests__/helpers';
import { FlawLabelTypeEnum } from '@/types/zodFlaw';
import { StateEnum } from '@/generated-client';

import FlawLabelTableEditingRow from '../FlawLabelTableEditingRow.vue';
import FlawLabelsContributor from '../FlawLabelsContributor.vue';

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

  it.each([
    FlawLabelTypeEnum.WORKFLOW,
    FlawLabelTypeEnum.PRODUCT_FAMILY,
    FlawLabelTypeEnum.ALIAS,
  ])('should not show state select for %s labels', (type) => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        initalLabel: { type, name: 'test-label', contributor: '', state: StateEnum.New, relevant: true },
      },
    });

    const selects = wrapper.findAll('select');
    expect(selects.length).toBe(0);
  });

  it.each([
    FlawLabelTypeEnum.WORKFLOW,
    FlawLabelTypeEnum.PRODUCT_FAMILY,
    FlawLabelTypeEnum.ALIAS,
  ])('should not show contributor input for %s labels', (type) => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        initalLabel: { type, name: 'test-label', contributor: '', state: StateEnum.New, relevant: true },
      },
    });

    expect(wrapper.findComponent(FlawLabelsContributor).exists()).toBe(false);
  });

  it.each([
    FlawLabelTypeEnum.CONTEXT_BASED,
    FlawLabelTypeEnum.BU,
  ])('should show state select and contributor input for %s labels', (type) => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        initalLabel: { type, name: 'test-label', contributor: '', state: StateEnum.New, relevant: true },
      },
    });

    const stateSelect = wrapper.find('select');
    expect(stateSelect.exists()).toBe(true);
    expect(wrapper.findComponent(FlawLabelsContributor).exists()).toBe(true);
  });

  it('should show state select when creating new context_based label', () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        contextLabels: ['test'],
      },
    });

    const selects = wrapper.findAll('select');
    expect(selects.length).toBe(3);
  });

  it('should not show state select when creating new workflow label', async () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow);

    const typeSelect = wrapper.findAll('select')[1];
    await typeSelect.setValue(FlawLabelTypeEnum.WORKFLOW);

    const selects = wrapper.findAll('select');
    expect(selects.length).toBe(1);
  });

  it.each([
    FlawLabelTypeEnum.WORKFLOW,
    FlawLabelTypeEnum.ALIAS,
  ])('should not show state text when creating new %s label', async (type) => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow);

    const typeSelect = wrapper.findAll('select')[1];
    await typeSelect.setValue(type);

    const stateTd = wrapper.findAll('td')[0];
    expect(stateTd.text()).toBe('');
  });

  it('should not apply strikethrough on name for new labels', () => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        contextLabels: ['test'],
      },
    });

    const nameTd = wrapper.findAll('td')[2];
    expect(nameTd.classes()).not.toContain('text-decoration-line-through');
  });

  it.each([
    FlawLabelTypeEnum.WORKFLOW,
    FlawLabelTypeEnum.ALIAS,
  ])('should not emit state or contributor when saving new %s label', async (type) => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow);

    const typeSelect = wrapper.findAll('select')[1];
    await typeSelect.setValue(type);

    const nameInput = wrapper.find('input[type="text"]');
    await nameInput.setValue('test-name');

    await wrapper.find('button[title="Save"]').trigger('click');

    const saved = wrapper.emitted('save')?.[0]?.[0] as Record<string, unknown>;
    expect(saved.state).toBeUndefined();
    expect(saved.contributor).toBeUndefined();
    expect(saved.relevant).toBeUndefined();
  });

  it.each([
    FlawLabelTypeEnum.WORKFLOW,
    FlawLabelTypeEnum.ALIAS,
  ])('should not show state when re-editing a draft %s label', (type) => {
    const wrapper = mountWithConfig(FlawLabelTableEditingRow, {
      props: {
        initalLabel: { type, name: 'draft-label', state: undefined, contributor: undefined, relevant: undefined },
      },
    });

    const stateTd = wrapper.findAll('td')[0];
    expect(stateTd.text()).toBe('');
  });
});
