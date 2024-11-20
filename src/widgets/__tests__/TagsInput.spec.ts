import { mount } from '@vue/test-utils';

import TagsInput from '@/widgets/TagsInput/TagsInput.vue';

describe('tagsInput', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(TagsInput, {
      props: {
        modelValue: [],
      },
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findAll('.osim-pill-list-item').length).toBe(0);
  });

  it('adds new items correctly', async () => {
    const wrapper = mount(TagsInput, {
      props: {
        modelValue: [],
      },
    });
    const input = wrapper.find('input');
    await input.setValue('New Item');
    await input.trigger('keydown.enter');
    expect(wrapper.props('modelValue')).toContain('New Item');
  });

  it('removes items correctly', async () => {
    const wrapper = mount(TagsInput, {
      props: {
        modelValue: ['Item 1', 'Item 2'],
      },
    });
    const removeButton = wrapper.findAll('.bi-x-square').at(0);
    await removeButton!.trigger('click');
    expect(wrapper.props('modelValue')).not.toContain('Item 1');
  });

  it('edits items correctly', async () => {
    const wrapper = mount(TagsInput, {
      props: {
        modelValue: ['Item 1'],
      },
    });
    await wrapper.find('.osim-pill-list-item span').trigger('click');
    await wrapper.find('input').setValue('Edited Item');
    await wrapper.find('input').trigger('keydown.enter');
    expect(wrapper.props('modelValue')).toContain('Edited Item');
  });

  it('displays error message correctly', () => {
    const wrapper = mount(TagsInput, {
      props: {
        modelValue: [],
        error: 'Test Error',
      },
    });
    expect(wrapper.find('.invalid-tooltip').text()).toBe('Test Error');
  });
});
