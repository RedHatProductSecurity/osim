import { mount } from '@vue/test-utils';

import JiraUser from '../JiraUser.vue';

describe('jiraUser', () => {
  it('renders correctly with only displayName', () => {
    const wrapper = mount(JiraUser, {
      props: { displayName: 'John Doe' },
    });
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders correctly with displayName and emailAddress', () => {
    const wrapper = mount(JiraUser, {
      props: {
        displayName: 'John Doe',
        emailAddress: 'john.doe@example.com',
      },
    });
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders correctly with all props', () => {
    const wrapper = mount(JiraUser, {
      props: {
        displayName: 'John Doe',
        emailAddress: 'john.doe@example.com',
        name: 'johndoe',
        query: 'Doe',
      },
    });
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('highlights the query text', () => {
    const wrapper = mount(JiraUser, {
      props: {
        displayName: 'John Doe',
        query: 'Doe',
      },
    });
    expect(wrapper.html()).toContain('<b>Doe</b>');
    expect(wrapper.html()).toMatchSnapshot();
  });
});
