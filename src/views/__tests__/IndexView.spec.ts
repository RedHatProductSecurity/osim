import { ref } from 'vue';

import { flushPromises, type VueWrapper } from '@vue/test-utils';

import IssueQueue from '@/components/IssueQueue.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';

import { useFlawsFetching } from '@/composables/useFlawsFetching';

import { mountWithConfig } from '@/__tests__/helpers';
import { useSearchStore } from '@/stores/SearchStore';

import IndexView from '../IndexView.vue';

vi.mock('@/composables/useFlawsFetching', () => ({
  useFlawsFetching: vi.fn().mockReturnValue({
    issues: [],
    loadFlaws: vi.fn(),
    isLoading: false,
    isFinalPageFetched: false,
    total: 0,
  }),
}));

vi.mock('@/stores/SearchStore', () => ({
  useSearchStore: vi.fn().mockReturnValue({
    savedSearches: [
      { name: 'name', searchFilters: { affects__ps_component: 'test' }, queryFilter: 'django query', isDefault: false },
    ],
  }),
}));

describe('indexView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render', () => {
    const wrapper = mountWithConfig(IndexView);

    expect(wrapper.findComponent(IssueQueue).exists()).toBeTruthy();
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should call loadFlaws on mount with default filter', async () => {
    const { loadFlaws } = useFlawsFetching();
    mountWithConfig(IndexView);

    await flushPromises();

    expect(loadFlaws).toHaveBeenCalledTimes(1);
    expect(loadFlaws).toHaveBeenCalledWith(expect.objectContaining({
      _value: {
        order: '-created_dt',
      },
    }));
  });

  it('should call loadFlaws on mount without filters', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [],
    });
    const { loadFlaws } = useFlawsFetching();
    const wrapper = mountWithConfig(IndexView);

    await wrapper.find('div.osim-incident-filter').findComponent(LabelCheckbox).trigger('click');
    await flushPromises();

    expect(loadFlaws).toHaveBeenCalledTimes(1);
    expect(loadFlaws).toHaveBeenCalledWith(expect.objectContaining({
      _value: {
        order: '-created_dt',
      },
    }));
  });

  it('should load default saved search when set', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [
        {
          name: 'name',
          searchFilters: { affects__ps_component: 'test' },
          queryFilter: 'django query',
          isDefault: true,
        },
      ],
      defaultSearch: null,
    });
    const wrapper = mountWithConfig(IndexView);

    await flushPromises();

    const savedSearches = wrapper.findAll('details > div > .btn');
    expect(savedSearches[0].find('i.bi-star-fill').exists()).toBeTruthy();
  });

  it('should not load default saved search when not set', async () => {
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
    const wrapper = mountWithConfig(IndexView);

    await flushPromises();

    const savedSearches = wrapper.findAll('details > div > .btn');
    expect(savedSearches[0].find('i.bi-star-fill').exists()).toBeFalsy();
  });

  it('should call loadFlaws when filters are changed', async () => {
    const { loadFlaws } = useFlawsFetching();
    const wrapper: VueWrapper<Partial<{ setTableFilters: (filters: unknown) => void }>> = mountWithConfig(IndexView);
    await flushPromises();

    wrapper.vm.setTableFilters!(ref({
      order: 'updated_dt',
    }));
    await flushPromises();

    expect(loadFlaws).toHaveBeenCalledTimes(2);
    expect(loadFlaws).toHaveBeenCalledWith(expect.objectContaining({
      _value: {
        order: 'updated_dt',
      },
    }));
  });

  it('shouldn\'t render empty saved searches', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      savedSearches: [],
    });
    const wrapper = mountWithConfig(IndexView);
    const savedSearches = wrapper.findAll('details > div > .btn');
    expect(savedSearches.length).toBe(0);
  });

  it('should render saved searches', async () => {
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
    const wrapper = mountWithConfig(IndexView);
    const savedSearches = wrapper.findAll('details > div > .btn');
    expect(savedSearches[0].attributes('title')).toBe('Query: django query\nFields: affects__ps_component: test');
  });

  it('should select saved searches', async () => {
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
    const wrapper: VueWrapper<Partial<{ selectSavedSearch: (index: number) => void }>> = mountWithConfig(IndexView);

    wrapper.vm.selectSavedSearch!(0);
    await flushPromises();

    const selectedSavedSearch = wrapper.find('details > div > .btn-secondary');
    expect(selectedSavedSearch.exists()).toBeTruthy();
  });

  it('should deselect saved searches', async () => {
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
    const wrapper: VueWrapper<Partial<{ selectSavedSearch: (index: number) => void }>> = mountWithConfig(IndexView);

    wrapper.vm.selectSavedSearch!(0);
    await flushPromises();

    let selectedSavedSearch = wrapper.find('details > div > .btn-secondary');
    await selectedSavedSearch.trigger('click');
    selectedSavedSearch = wrapper.find('details > div > .btn-secondary');
    expect(selectedSavedSearch.exists()).toBeFalsy();
  });

  it('should apply saved search', async () => {
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
    const { loadFlaws } = useFlawsFetching();
    const wrapper = mountWithConfig(IndexView);

    const savedSearches = wrapper.findAll('details > div > .btn');

    await savedSearches[0].trigger('click');
    await flushPromises();

    expect(loadFlaws).toHaveBeenCalledTimes(1);
    expect(loadFlaws).toHaveBeenCalledWith(expect.objectContaining({
      _value: {
        order: '-created_dt',
        affects__ps_component: 'test',
        query: 'django query',
      },
    }));
  });
});
