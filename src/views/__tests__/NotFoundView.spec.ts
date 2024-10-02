import { mountWithConfig } from '@/__tests__/helpers';

import NotFoundView from '../NotFoundView.vue';

describe('notFoundView', () => {
  it('should render', () => {
    const wrapper = mountWithConfig(NotFoundView);

    expect(wrapper.html()).toMatchSnapshot();
  });
});
