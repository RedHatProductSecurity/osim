import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import PurlField from '@/components/FlawForm/PurlField.vue';

describe('PurlField.vue', () => {
  let wrapper: any;
  let input: any;

  beforeEach(() => {
    wrapper = mount(PurlField);
    input = wrapper.find('input');
  });

  it('should pass valid PURL test', async () => {
    input.setValue('pkg:npm/%40angular/core@12.0.0');
    await input.trigger('input');
    expect(wrapper.vm.error).toBeNull();
  });

  it('should pass invalid PURL test', async () => {
    input.setValue('invalid-purl');
    await input.trigger('input');
    expect(wrapper.vm.error).not.toBeNull();
  });
});
