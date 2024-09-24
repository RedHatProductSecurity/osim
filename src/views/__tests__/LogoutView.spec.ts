import { mountWithConfig } from '@/__tests__/helpers';

import LogoutView from '../LogoutView.vue';

describe('logoutView', () => {
  it('should render', () => {
    const wrapper = mountWithConfig(LogoutView);

    expect(wrapper.html()).toMatchSnapshot();
  });
});
