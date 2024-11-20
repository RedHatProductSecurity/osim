import { mount } from '@vue/test-utils';

import EditableText from '@/widgets/EditableText/EditableText.vue';

describe('editableText', () => {
  it('renders correctly', () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value' },
    });
    expect(wrapper.text()).toContain('Initial value');
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('shows edit button on hover', async () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value' },
    });
    await wrapper.trigger('mouseenter');
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('switches to input mode on edit button click', async () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value' },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('commits changes on save button click', async () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value' },
    });
    await wrapper.find('button').trigger('click');
    const input = wrapper.find('input');
    await input.setValue('New value');
    await wrapper.find('.bi-check').trigger('click');
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['New value']);
  });

  it('reverts changes on abort button click', async () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value' },
    });
    await wrapper.find('button').trigger('click');
    const input = wrapper.find('input');
    await input.setValue('New value');
    await wrapper.find('.bi-x').trigger('click');
    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();
  });

  it('aborts changes on escape key press', async () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value' },
    });
    await wrapper.find('button').trigger('click');
    const input = wrapper.find('input');
    await input.setValue('New value');
    await input.trigger('keyup.esc');
    expect(wrapper.emitted()['update:modelValue']).toBeUndefined();
  });

  it('displays error message when error prop is set', () => {
    const wrapper = mount(EditableText, {
      props: { modelValue: 'Initial value', error: 'Error message' },
    });
    expect(wrapper.find('.invalid-tooltip').text()).toBe('Error message');
  });
});
