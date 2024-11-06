import { type ExtractPublicPropTypes } from 'vue';

import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { useRouter } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { number } from 'zod';

import { useSearchStore } from '@/stores/SearchStore';

describe('issueSearchAdvanced', () => {
  let IssueSearchAdvanced: typeof import('@/components/IssueSearchAdvanced.vue').default;

  vi.mock('@mrmarble/djangoql-completion');
  vi.mock('vue-router', () => ({
    useRoute: vi.fn().mockReturnValue({
      query: {},
    }),
    useRouter: vi.fn().mockReturnValue({
      replace: vi.fn().mockResolvedValue(''),
    }),
  }));

  vi.mock('@/stores/SearchStore', () => ({
    useSearchStore: vi.fn().mockReturnValue({
      savedSearches: [
        {
          name: 'name',
          searchFilters: { affects__ps_component: 'test' },
          queryFilter: 'django query',
          isDefault: false,
        },
      ],
    }),
  }));

  const mountIssueSearchAdvanced = async (props?: ExtractPublicPropTypes<typeof IssueSearchAdvanced>) => {
    const wrapper = mount(IssueSearchAdvanced, {
      props: {
        isLoading: false,
        ...props,
      },
      global: {
        plugins: [createTestingPinia()],
      },
      loadedSearch: number,
      selectSavedSearch: vi.fn(),
    });
    return wrapper;
  };

  beforeEach(async () => {
    IssueSearchAdvanced = (await import('@/components/IssueSearchAdvanced.vue')).default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it.each([true, false])('should render when `isLoading` is %s', async (isLoading) => {
    const wrapper = await mountIssueSearchAdvanced({ isLoading });

    expect(wrapper.html()).toMatchSnapshot();
    expect(wrapper.find('summary').text()).toEqual('Advanced Search');
    expect(wrapper.find('form').isVisible).toBeTruthy();
  });

  it('should show modal when query label is clicked', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    await wrapper.find('[aria-label="hide query filter"]').trigger('click');

    expect(wrapper.find('.modal').isVisible()).toBeTruthy();
    expect(wrapper.find('h1').text()).toEqual('Query Filter Guide');
  });

  it('should update query params when form is submitted', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    const router = vi.mocked(useRouter());

    await wrapper.find('textarea').setValue('djangoql query');
    await wrapper.find('form').trigger('submit');

    expect(router.replace).toHaveBeenNthCalledWith(1, { query: { query: 'djangoql query' } });
  });

  it('should set facets when populated', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    const router = vi.mocked(useRouter());

    await wrapper.find('select').setValue('cve_description');
    await wrapper.find('.input-group input').setValue('some value');
    await wrapper.findAll('select').at(1)!.setValue('impact');
    await wrapper.find('select+select').setValue('CRITICAL');
    await wrapper.find('form').trigger('submit');

    expect(router.replace).toHaveBeenNthCalledWith(1, { query: { cve_description: 'some value', impact: 'CRITICAL' } });
  });

  it('should add new facet when last facet is populated', async () => {
    const wrapper = await mountIssueSearchAdvanced();

    await wrapper.find('select').setValue('cve_description');
    await wrapper.find('.input-group input').setValue('some value');

    expect(wrapper.findAll('select').length).toEqual(3);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should search for nonempty cve description', async () => {
    const wrapper = await mountIssueSearchAdvanced();
    const router = vi.mocked(useRouter());

    await wrapper.find('select').setValue('cve_description');
    await wrapper.findAll('.input-group .btn-group .btn')[1].trigger('click');
    await wrapper.find('form').trigger('submit');

    expect(router.replace).toHaveBeenNthCalledWith(1, { query: { cve_description: 'nonempty' } });
  });

  it('shouldn\'t display empty saved searches', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [],
    });
    const wrapper = await mountIssueSearchAdvanced();
    const savedSearchesContainer = wrapper.findAll('details')[1];
    const savedSearches = savedSearchesContainer.findAll('div')[0].findAll('.btn');
    expect(savedSearches.length).toBe(0);
  });

  it('should display saved searches', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [
        {
          name: 'name',
          searchFilters: { affects__ps_component: 'test' },
          queryFilter: 'django query',
          isDefault: false,
        },
      ],
    });
    const wrapper = await mountIssueSearchAdvanced();
    const savedSearchesContainer = wrapper.findAll('details')[1];
    const savedSearches = savedSearchesContainer.findAll('div')[0].findAll('.btn');
    expect(savedSearches[0].text()).toBe('name');
  });

  it('should save new search', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [],
      saveSearch: vi.fn(),
    });
    const wrapper = await mountIssueSearchAdvanced();
    await wrapper.find('textarea').setValue('djangoql query');
    await wrapper.find('[aria-label="Save search"]').trigger('click');
    await wrapper.find('.modal-body > input').setValue('name-1');

    const saveBtn = wrapper.find('.modal-footer > .btn-primary');
    await saveBtn.trigger('click');

    const { saveSearch } = useSearchStore();
    expect(saveSearch).toHaveBeenCalledTimes(1);
    expect(saveSearch).toHaveBeenCalledWith('name-1', {}, 'djangoql query');
  });

  it('should allow selecting saved searches', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [
        {
          name: 'name',
          searchFilters: { affects__ps_component: 'test' },
          queryFilter: 'django query',
          isDefault: false,
        },
      ],
    });
    const wrapper = await mountIssueSearchAdvanced();
    const btns = wrapper.findAll('details > div > .btn');
    await btns[0].trigger('click');
    expect(btns[0].classes().toString()).toContain('btn-secondary');
  });

  it('should remove saved searches', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [
        {
          name: 'name',
          searchFilters: { affects__ps_component: 'test' },
          queryFilter: 'django query',
          isDefault: false,
        },
      ],
    });
    const wrapper = await mountIssueSearchAdvanced();
    let btns = wrapper.findAll('details > div > .btn');
    await btns[0].trigger('click');
    await wrapper.find('[aria-label="Delete search"]').trigger('click');
    btns = wrapper.findAll('details > div > .btn');
    expect(btns[0].text()).not.toBe(('name'));
  });
});
