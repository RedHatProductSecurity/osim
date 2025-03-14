import { mount } from '@vue/test-utils';
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
});
