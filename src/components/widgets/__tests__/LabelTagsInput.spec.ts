import LabelTagsInput from '../LabelTagsInput.vue';
import { mount } from '@vue/test-utils';

describe('LabelTagsInput', () => {
  it('renders properly', () => {
    const subject = mount(LabelTagsInput, {
      props: {
        modelValue: ['test1', 'test2'],
        error: '',
        label: 'test label',
      },
    });

    expect(subject.text()).toContain('test1');
    expect(subject.text()).toContain('test2');
    expect(subject.text()).toContain('test label');
  });

  it('renders properly with error', () => {
    const subject = mount(LabelTagsInput, {
      props: {
        modelValue: [],
        error: 'some error',
      },
    });

    expect(subject.text()).toContain('error');
  });
});
