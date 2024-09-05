import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import FlawSearchView from '@/views/FlawSearchView.vue';
import { useFlawsFetching } from '../../composables/useFlawsFetching';
import { useSearchStore } from '@/stores/SearchStore';
import { useToastStore } from '@/stores/ToastStore';
import { useSearchParams } from '@/composables/useSearchParams';
import { ref, type ComponentPublicInstance, type Ref } from 'vue';

const mountFlawSearchView = (): VueWrapper<ComponentPublicInstance
  & Partial<{
    params: Record<string, string>,
    setTableFilters: (filters: Ref<Record<string, string>>) => void,
    fetchMoreFlaws: () => void,
    saveFilter: () => void,
  }>> => mount(FlawSearchView, {
  global: {
    plugins: [createTestingPinia()],
  },
  shallow: true,
});

describe('flawSearchView', () => {
  vi.mock('@/composables/useSearchParams', async () => {
    const { ref } = await import('vue');
    return ({
      useSearchParams: vi.fn().mockReturnValue({
        getSearchParams: vi.fn().mockReturnValue({
          query: 'djangoql query',
          search: 'quick search',
        }),
        facets: ref([]),
      })
    });
  });

  vi.mock('@/composables/useFlawsFetching', async () => {
    const { ref } = await import('vue');
    return ({
      useFlawsFetching: vi.fn().mockReturnValue({
        issues: ref([]),
        isLoading: ref(false),
        isFinalPageFetched: ref(false),
        total: 1337,
        loadFlaws: vi.fn(),
        loadMoreFlaws: vi.fn()
      })
    });
  });


  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render', () => {
    const wrapper = mountFlawSearchView();

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('should load flaws when params change', async () => {
    const wrapper = mountFlawSearchView();
    const { loadFlaws } = useFlawsFetching();

    wrapper.vm.setTableFilters!(ref({
      order: 'created_dt'
    }));
    await flushPromises();

    expect(loadFlaws).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.params).toEqual({
      query: 'djangoql query',
      search: 'quick search',
      order: 'created_dt'
    });
  });

  it('should join filters with existing ones', async () => {
    vi.mocked(useSearchParams, {
      partial: true
    }).mockReturnValue({
      getSearchParams: vi.fn().mockReturnValue({
        query: 'some advanced query',
        order: 'cve_id'
      }),
      facets: ref([])
    });
    const wrapper = mountFlawSearchView();

    wrapper.vm.setTableFilters!(ref({
      order: 'updated_dt'
    }));
    await flushPromises();

    expect(wrapper.vm.params).toEqual({
      query: 'some advanced query',
      order: 'cve_id,updated_dt'
    });
  });

  it('should call loadMoreFlaws when fetchMoreFlaws is called', async () => {
    const wrapper = mountFlawSearchView();
    const { loadMoreFlaws } = useFlawsFetching();

    wrapper.vm.fetchMoreFlaws!();
    await flushPromises();

    expect(loadMoreFlaws).toHaveBeenCalledTimes(1);
  });

  it('should save filters to store', async () => {
    vi.mocked(useSearchParams, {
      partial: true
    }).mockReturnValue({
      getSearchParams: vi.fn().mockReturnValue({}),
      facets: ref([{ field:'cve_id', value: 'CVE-2024-1234' }]),
      query: ref('django query'),
    });
    const wrapper = mountFlawSearchView();
    const searchStore = useSearchStore();
    const toastStore = useToastStore();

    wrapper.vm.saveFilter!();
    await flushPromises();

    expect(searchStore.saveFilter).toHaveBeenNthCalledWith(1, { cve_id: 'CVE-2024-1234' }, 'django query');
    expect(toastStore.addToast).toHaveBeenCalledTimes(1);
  });
});
