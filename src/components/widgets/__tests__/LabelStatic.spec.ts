import { describe, it, expect } from 'vitest';
import LabelStatic from '../LabelStatic.vue';
import { mount } from '@vue/test-utils';

describe('LabelStatic', () => {
  it('renders properly', () => {
    const subject = mount(LabelStatic, {
      props: {
        modelValue: 'Example Form',
        label: 'Test Label',
        error: '',
      },
    });

    expect(subject.text()).toContain('Example Form');
  });
});
