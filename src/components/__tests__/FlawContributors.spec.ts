import { flushPromises, mount } from '@vue/test-utils';
import FlawContributors from '../FlawContributors.vue';
import { LoadingAnimationDirective } from '@/directives/LoadingAnimationDirective';
import { ref, type ExtractPublicPropTypes } from 'vue';
import type { ZodJiraContributorType } from '@/types/zodJira';

const useJiraContributors = {
  contributors: ref<Partial<ZodJiraContributorType>[]>([]),
  isLoadingContributors: false,
  loadJiraContributors: vi.fn(),
  searchContributors: vi.fn(),
  saveContributors: vi.fn()

};

vi.mock('@/composables/useJiraContributors', () => ({
  default: () => useJiraContributors
}));

describe('FlawContributors', () => {
  const contributor = { name: 'test', html: '<b>test</b> user', displayName: 'test user' };
  const mountComponent = (props?: ExtractPublicPropTypes<typeof FlawContributors>) =>
    mount(FlawContributors, {
      props: {
        taskKey: 'TASK-123',
        ...props
      },
      global: {
        directives: {
          'osim-loading': LoadingAnimationDirective
        }
      }
    });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Contributors');
  });

  it('should call loadJiraContributors on mount', () => {
    mountComponent();
    expect(useJiraContributors.loadJiraContributors).toHaveBeenCalled();
  });

  it('should show loading animation when loading contributors', async () => {
    useJiraContributors.isLoadingContributors = true;
    const wrapper = mountComponent();
    expect(wrapper.find('.spinner-grow').exists()).toBe(true);
  });

  it('should call searchContributors when input changes', async () => {
    const wrapper = mountComponent();
    const input = wrapper.find('input');
    await input.setValue('test');

    vi.runAllTimers();

    expect(useJiraContributors.searchContributors).toHaveBeenCalled();
  });

  it('should show search results when search is done', async () => {
    useJiraContributors.searchContributors.mockResolvedValue([{ name: 'test', displayName: 'test user' }]);
    const wrapper = mountComponent();
    const input = wrapper.find('input');
    await input.setValue('test');

    vi.runAllTimers();
    await flushPromises();

    expect(wrapper.find('.menu').exists()).toBe(true);
    expect(wrapper.find('.menu').text()).toContain('test user');
  });

  it('should add contributor when clicked', async () => {
    useJiraContributors.searchContributors.mockResolvedValue([contributor]);
    const wrapper = mountComponent();
    const input = wrapper.find('input');
    await input.setValue('test');

    vi.runAllTimers();
    await flushPromises();

    const user = wrapper.find('.menu > :first-child');
    await user.trigger('click');

    expect(useJiraContributors.contributors.value).toEqual([contributor]);
    expect(wrapper.find('.badge').exists()).toBe(true);
    expect(wrapper.find('.badge').text()).toContain('test user');
  });

  it('should remove contributor when clicked', async () => {
    const contributor = { name: 'test', html: '<b>test</b> user', displayName: 'test user' };
    useJiraContributors.contributors.value = [contributor];
    const wrapper = mountComponent();
    const badge = wrapper.find('.badge i');
    await badge.trigger('click');

    expect(useJiraContributors.contributors.value).toEqual([]);
    expect(wrapper.find('.badge').exists()).toBe(false);
  });
});
