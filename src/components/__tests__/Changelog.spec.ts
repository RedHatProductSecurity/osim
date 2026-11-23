import { flushPromises, mount } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';

import ChangeLog from '@/components/ChangeLog/ChangeLog.vue';

import { osimRuntime } from '@/stores/osimRuntime';
import { server } from '@/__tests__/setup';

describe('changelog', () => {
  beforeAll(() => {
    server.use(http.get(`${osimRuntime.value.backends.osidb}/CHANGELOG.md`,
      () => HttpResponse.text('## Changelog\n\n### 1.0.0\n\n- Initial release\n')));
  });

  it('should render', () => {
    const wrapper = mount(ChangeLog);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('loads the changelog only when opened and reuses it on later opens', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const wrapper = mount(ChangeLog);
    expect(fetchSpy).not.toHaveBeenCalled();

    await wrapper.find('a').trigger('click');
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.html()).toContain('Initial release');

    await wrapper.find('a').trigger('click');
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('shows an error and allows retrying a failed load', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('network error'));
    const wrapper = mount(ChangeLog);
    await wrapper.find('a').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load changelog');

    await wrapper.find('a').trigger('click');
    await flushPromises();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    fetchSpy.mockRestore();
  });
});
