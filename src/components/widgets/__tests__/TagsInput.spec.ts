import { mount } from '@vue/test-utils';

import TagsInput from '../TagsInput.vue';

describe('tagsInput', () => {
  it('renders properly', () => {
    const subject = mount(TagsInput, {
      props: {
        modelValue: ['test1', 'test2'],
        error: '',
      },
    });

    expect(subject.text()).toContain('test1');
    expect(subject.text()).toContain('test2');
  });

  it('renders properly with error', () => {
    const subject = mount(TagsInput, {
      props: {
        modelValue: [],
        error: 'some error',
      },
    });

    expect(subject.text()).toContain('error');
  });
});
