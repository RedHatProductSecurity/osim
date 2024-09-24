import { mountWithConfig } from '@/__tests__/helpers';

import LoginView from '../LoginView.vue';

describe('loginView', () => {
  it('should render', () => {
    const wrapper = mountWithConfig(LoginView);

    expect(wrapper.html()).toMatchSnapshot();
  });
});
