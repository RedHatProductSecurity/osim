import { flushPromises, type VueWrapper } from '@vue/test-utils';

import FlawFormOwner from '@/components/FlawFormOwner/FlawFormOwner.vue';

import { searchJiraUsers } from '@/services/JiraService';
import { mountWithConfig } from '@/__tests__/helpers';

vi.mock('@/services/JiraService', () => ({
  searchJiraUsers: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/stores/UserStore', () => ({
  useUserStore: vi.fn().mockReturnValue({
    userEmail: 'skynet@redhat.com',
    jiraUsername: 'Skynet Display Name',
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

    expect(subject.text()).toContain('skynet@redhat.com');
    expect(subject.html()).toMatchSnapshot();
  });

  it('self assign uses user email, not jira username', async () => {
    await subject.find('button.osim-self-assign').trigger('click');
    await subject.vm.$nextTick();

    expect(subject.text()).toContain('skynet@redhat.com');
    expect(subject.text()).not.toContain('Skynet Display Name');
  });

  it('should call "searchJiraUsers" when input changes', async () => {
    const input = subject.find('input');
    await input.setValue('test');

    vi.runAllTimers();

    expect(searchJiraUsers).toHaveBeenCalled();
  });

  it('should show results when input changes', async () => {
    vi.mocked(searchJiraUsers, { partial: true }).mockResolvedValueOnce({
      data: [{ accountId: 'test-id', displayName: 'Test User' }],
    });
    const input = subject.find('input');
    await input.setValue('test');

    vi.runAllTimers();
    await flushPromises();

    expect(subject.text()).toContain('Test User');
  });
});
