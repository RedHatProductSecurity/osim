import { mountWithConfig } from '@/__tests__/helpers';

import SettingsView from '../SettingsView.vue';

describe('settingsView', () => {
  it('should render', () => {
    const wrapper = mountWithConfig(SettingsView);

    expect(wrapper.html()).toMatchSnapshot();
  });
});
