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
    queryFilter: 'django query',
    searchFilters: { affects__ps_component: 'test' },
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
        affects__ps_component: 'test',
        query: 'django query',
      },
    }));
  });

  it('should call loadFlaws on mount without filters', async () => {
    vi.mocked(useSearchStore, { partial: true }).mockReturnValue({
      queryFilter: '',
      searchFilters: {},
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
});
