import { type Directive } from 'vue';

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { IMaskDirective } from 'vue-imask';

import ExampleForm from '../ExampleForm.vue';

describe('exampleForm', () => {
  it('renders properly', () => {
    const wrapper = mount(ExampleForm, {
      props: {
        msg: 'Example Form',
      },
      global: {
        directives: {
          imask: IMaskDirective as Directive,
        },
      },
    });
    expect(wrapper.text()).toContain('Example Form');
  });
});
