import { mount } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import DjangoQLInput from '@/components/DjangoQLInput.vue';

import { osimRuntime } from '@/stores/osimRuntime';
import { server } from '@/__tests__/setup';

describe('djangoQLInput', () => {
  beforeAll(() => {
    server.use(
      http.get(`${osimRuntime.value.backends.osidb}/osidb/api/v1/introspection`,
        () => HttpResponse.json({}, { status: 200 })),
    );
    vi.useFakeTimers();
  });

  it('should render', async () => {
    const wrapper = mount(DjangoQLInput);

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should instantiate djangoql-completion on mount', async () => {
    mount(DjangoQLInput);

    expect(document.body.querySelector('.djangoql-completion')).toBeTruthy();
  });

  it('should cleanup on unmount', async () => {
    const wrapper = mount(DjangoQLInput);
    wrapper.unmount();

    expect(document.body.querySelector('.djangoql-completion')).toBeFalsy();
  });

  it('should emit `submit` event on suggestions submit', async () => {
    const wrapper = mount(DjangoQLInput);

    await wrapper.find('textarea').setValue('impact = "Low"');
    await wrapper.find('textarea').trigger('keydown.Enter');

    expect(wrapper.emitted()).toHaveProperty('submit');
    expect(wrapper.emitted('submit')![0]).toEqual(['impact = "Low"']);
  });
});
