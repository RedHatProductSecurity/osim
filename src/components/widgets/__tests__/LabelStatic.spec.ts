import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import LabelStatic from '../LabelStatic.vue';

describe('labelStatic', () => {
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
