import { ref, type ComponentPublicInstance, type Ref } from 'vue';

import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';

import { useSearchParams } from '@/composables/useSearchParams';
import { useFlawsFetching } from '@/composables/useFlawsFetching';

import FlawSearchView from '@/views/FlawSearchView.vue';

const mountFlawSearchView = (): VueWrapper<ComponentPublicInstance
  & Partial<{
    fetchMoreFlaws: () => void;
    params: Record<string, string>;
    setTableFilters: (filters: Ref<Record<string, string>>) => void;
  }>> => mount(FlawSearchView, {
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
      }),
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
        loadMoreFlaws: vi.fn(),
      }),
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
      order: 'created_dt',
    }));
    await flushPromises();

    expect(loadFlaws).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.params).toEqual({
      query: 'djangoql query',
      search: 'quick search',
      order: 'created_dt',
    });
  });

  it('should join filters with existing ones', async () => {
    vi.mocked(useSearchParams, {
      partial: true,
    }).mockReturnValue({
      getSearchParams: vi.fn().mockReturnValue({
        query: 'some advanced query',
        order: 'cve_id',
      }),
      facets: ref([]),
    });
    const wrapper = mountFlawSearchView();

    wrapper.vm.setTableFilters!(ref({
      order: 'updated_dt',
    }));
    await flushPromises();

    expect(wrapper.vm.params).toEqual({
      query: 'some advanced query',
      order: 'cve_id,updated_dt',
    });
  });

  it('should call loadMoreFlaws when fetchMoreFlaws is called', async () => {
    const wrapper = mountFlawSearchView();
    const { loadMoreFlaws } = useFlawsFetching();

    wrapper.vm.fetchMoreFlaws!();
    await flushPromises();

    expect(loadMoreFlaws).toHaveBeenCalledTimes(1);
  });
});
