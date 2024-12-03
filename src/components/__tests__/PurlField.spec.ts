import { mount } from '@vue/test-utils';

import PurlField from '@/components/FlawForm/PurlField.vue';

describe('purlField.vue', () => {
  it('should pass valid PURL test', async () => {
    const wrapper = mount(PurlField, { props: { purl: 'pkg:npm/%40angular/core@12.0.0' } });
    // @ts-expect-error error does not exist on wrapper vm
    expect(wrapper.vm.error).toBeNull();
  });

  it('should pass invalid PURL test', async () => {
    const wrapper = mount(PurlField);
    const input = wrapper.find('input');
    input.setValue('invalid-purl');
    await input.trigger('input');
    // @ts-expect-error error does not exist on wrapper vm
    expect(wrapper.vm.error).not.toBeNull();
  });
});
