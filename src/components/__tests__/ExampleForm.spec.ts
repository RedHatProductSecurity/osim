import {describe, it, expect} from 'vitest';

import {mount} from '@vue/test-utils';
import ExampleForm from '../ExampleForm.vue';
import {IMaskDirective} from 'vue-imask';
import {type Directive} from 'vue';

describe('ExampleForm', () => {
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
