import { flushPromises, type VueWrapper } from '@vue/test-utils';

import { searchJiraUsers } from '@/services/JiraService';
import { mountWithConfig } from '@/__tests__/helpers';

import FlawFormOwner from '../FlawFormOwner.vue';

vi.mock('@/services/JiraService', () => ({
  searchJiraUsers: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/stores/UserStore', () => ({
  useUserStore: vi.fn().mockReturnValue({
    jiraUsername: 'skynet',
    updateJiraUsername: vi.fn().mockResolvedValue({}),
  }),
}));

describe('owner field', () => {
  let subject: VueWrapper<InstanceType<typeof FlawFormOwner>>;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(() => {
    subject = mountWithConfig(FlawFormOwner, {
      props: {
        taskKey: 'OSIM-1234',
      },
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should render the owner field', () => {
    expect(subject.exists()).toBe(true);
    expect(subject.html()).toMatchSnapshot();
  });

  it('assigns the test user when button is clicked', async () => {
    await subject.find('button.osim-self-assign').trigger('click');
    await subject.vm.$nextTick();

    expect(subject.text()).toContain('skynet');
    expect(subject.html()).toMatchSnapshot();
  });

  it('should call "searchJiraUsers" when input changes', async () => {
    const input = subject.find('input');
    await input.setValue('test');

    vi.runAllTimers();

    expect(searchJiraUsers).toHaveBeenCalled();
  });

  it('should show results when input changes', async () => {
    vi.mocked(searchJiraUsers, { partial: true }).mockResolvedValueOnce({
      data: {
        users:
          [{ name: 'test', displayName: 'Test User', avatarUrl: '' }],
      },
    });
    const input = subject.find('input');
    await input.setValue('test');

    vi.runAllTimers();
    await flushPromises();

    expect(subject.text()).toContain('Test User');
  });
});
