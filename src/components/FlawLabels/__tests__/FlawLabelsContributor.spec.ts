import { ref } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { mountWithConfig } from '@/__tests__/helpers';

import FlawLabelsContributor from '../FlawLabelsContributor.vue';

vi.mock('@/stores/UserStore', () => ({
  useUserStore: () => ({
    jiraUsername: 'skynet',
    updateJiraUsername: vi.fn(),
  }),
}));

vi.mock('@/services/JiraService', () => ({
  searchJiraUsers: () => {
    return Promise.resolve({ data: { users: [{ displayName: 'SkyNet', name: 'skynet' }] } });
  },
}));

vi.mock('@/composables/useFlaw', () => ({
  useFlaw: () => ({
    flaw: ref({
      task_key: '123',
    }),
  }),
}));

describe('flawLabelsContributor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render', () => {
    const wrapper = mountWithConfig(FlawLabelsContributor);

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should assign the contributor on self assign', async () => {
    const wrapper = mountWithConfig(FlawLabelsContributor, {
      props: {
        modelValue: 'skynet',
      },
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.props('modelValue')).toBe('skynet');
  });

  it('should assign the contributor on click', async () => {
    const wrapper = mountWithConfig(FlawLabelsContributor, {
      props: { 'onUpdate:modelValue': (e: string) => wrapper.setProps({ modelValue: e }) },
    });

    await wrapper.find('input').setValue('skynet');

    vi.runAllTimers();
    await flushPromises();
    await wrapper.find('div.item').trigger('click');

    expect(wrapper.props('modelValue')).toBe('skynet');
  });
});
