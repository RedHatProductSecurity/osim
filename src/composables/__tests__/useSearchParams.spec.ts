import { useSearchParams } from '../useSearchParams';
import { useRoute, useRouter } from 'vue-router';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  const replaceMock = vi.fn();
  const pushMock = vi.fn();

  return {
    ...actual,
    useRoute: vi.fn(() => ({ query: { mode: 'advanced', query: 'search' } })),
    useRouter: vi.fn(() => ({
      replace: replaceMock,
      push: pushMock
    }))
  };
});

describe('useSearchParams', () => {
  beforeEach(() => {
    (useRoute as Mock).mockReturnValue({
      'query': { mode: 'advanced', query: 'search' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initialized correctly', () => {
    const { facets, search } = useSearchParams();
    expect(search.value).toBe('');
    expect(facets.value.length).toBe(0);
  });

  it('update search value on submitQuickSearch', () => {
    const { facets, search, submitQuickSearch } = useSearchParams();
    expect(search.value).toBe('');
    expect(facets.value.length).toBe(0);
    submitQuickSearch('search');
    expect(search.value).toBe('search');
    expect(useRouter().push).toHaveBeenCalled();
    expect(useRouter().push.mock.calls[0][0])
      .toStrictEqual({ name: 'search', query: { query: 'search' } });
  });

  it('update facets on addFacet', () => {
    const { facets, addFacet } = useSearchParams();
    expect(facets.value.length).toBe(0);
    addFacet();
    expect(facets.value.length).toBe(1);
  });

  it('update facets on addFacet', () => {
    const { facets, removeFacet } = useSearchParams();
    facets.value = [
      { field:'test', value:'test' },
      { field:'test', value:'test' }
    ];
    removeFacet();
    expect(facets.value.length).toBe(1);
    removeFacet();
    expect(facets.value.length).toBe(1);
    expect(facets.value[0]).toStrictEqual({
      field:'', value:''
    });
  });

  it('getSearchParams', () => {
    (useRoute as Mock).mockReturnValue({
      'query': {
        mode: 'advanced',
        query: 'search',
        'affects__ps_component': 'test'
      },
    });
    const { getSearchParams } = useSearchParams();
    const searchParams = getSearchParams();
    expect(searchParams).toStrictEqual({
      'search': 'search',
      'affects__ps_component': 'test'
    });
  });

  it('populatedFacets from route', () => {
    (useRoute as Mock).mockReturnValue({
      'query': {
        mode: 'advanced',
        query: 'search',
        'affects__ps_component': 'test',
        'acknowledgments__name': 'test'
      },
    });
    const { populateFacets } = useSearchParams();
    const facets = populateFacets();
    expect(facets).toEqual([
      { field: 'affects__ps_component', value: 'test' },
      { field: 'acknowledgments__name', value: 'test' },
      { field: '', value: '' }
    ]);
  });

});
