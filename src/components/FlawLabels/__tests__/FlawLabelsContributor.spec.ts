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

const mountFlawLabelsContributor = (props = {}) => {
  const wrapper = mountWithConfig(FlawLabelsContributor, { props: {
    'onUpdate:modelValue': (e: string) => wrapper.setProps({ modelValue: e }),
    ...props,
  } });
  return wrapper;
};

describe('flawLabelsContributor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render', () => {
    const wrapper = mountFlawLabelsContributor();

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should assign the contributor on self assign', async () => {
    const wrapper = mountFlawLabelsContributor({
      modelValue: 'not-skynet',
    });

    await wrapper.find('button').trigger('click');

    expect(wrapper.props('modelValue')).toBe('skynet');
  });

  it('should assign the contributor on click', async () => {
    const wrapper = mountFlawLabelsContributor();

    await wrapper.find('input').setValue('skynet');

    vi.runAllTimers();
    await flushPromises();
    await wrapper.find('div.item').trigger('click');

    expect(wrapper.props('modelValue')).toBe('skynet');
  });

  it('should not allow arbitrary input', async () => {
    const wrapper = mountFlawLabelsContributor({ modelValue: 'skynet' });

    await wrapper.find('input').setValue('not-skynet');
    await wrapper.find('input').trigger('blur');

    expect(wrapper.props('modelValue')).toBe('skynet');
  });

  it('should allow empty input', async () => {
    const wrapper = mountFlawLabelsContributor({
      modelValue: 'skynet',
    });

    await wrapper.find('input').setValue('');
    await wrapper.find('input').trigger('blur');

    expect(wrapper.props('modelValue')).toBe('');
  });
});
