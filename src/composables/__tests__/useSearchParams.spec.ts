import type { App } from 'vue';

import { randomInt } from 'node:crypto';

import { useRoute, useRouter } from 'vue-router';

import { withSetup } from '@/__tests__/helpers';

import { useSearchParams } from '../useSearchParams';

vi.mock('vue-router', async (importOriginal) => {
  const replaceMock = vi.fn();
  const pushMock = vi.fn();
  const original = await importOriginal<typeof import('vue-router')>();
  return {
    ...original,
    useRoute: vi.fn(() => ({ query: { query: 'search' } })),
    useRouter: vi.fn(() => ({
      replace: replaceMock,
      push: pushMock,
    })),
  };
});

describe('useSearchParams', () => {
  let app: App;

  const mountSearchParams = () => {
    const [result, _app] = withSetup(useSearchParams);
    app = _app;
    return result;
  };

  afterEach(() => {
    app?.unmount();
  });

  it.each<{ query: string; search: string }>([
    { query: '', search: '' },
    { query: 'some text', search: 'some text' },
    { query: '', search: 'some text' },
    { query: 'some text', search: '' },
  ])('should initialize params %s', (params) => {
    vi.mocked(useRoute, { partial: true }).mockReturnValueOnce({
      query: params,
    });
    const { facets, query, search } = mountSearchParams();

    expect(search.value).toBe(params.search);
    expect(query.value).toBe(params.query);
    expect(facets.value).toEqual([{ field: '', value: '' }]);
  });

  it.each(['cve_id', 'embargoed', 'affects__affectedness'])('should initialize facet %s', (field) => {
    const randomValue = `test${randomInt(100)}`;
    vi.mocked(useRoute, { partial: true }).mockReturnValueOnce({
      query: {
        [field]: randomValue,
      },
    });
    const { facets } = mountSearchParams();

    expect(facets.value).toEqual([
      { field, value: randomValue },
      { field: '', value: '' },
    ]);
  });

  it('should update search value on submitQuickSearch', () => {
    const searchString = 'test search';
    const { search, submitQuickSearch } = mountSearchParams();

    submitQuickSearch(searchString);

    expect(search.value).toBe(searchString);
    expect(useRouter().push).toHaveBeenNthCalledWith(1, { name: 'search', query: { search: searchString } });
  });

  it('should update facets on addFacet', () => {
    const { addFacet, facets } = mountSearchParams();

    addFacet();

    expect(facets.value.length).toBe(2);
  });

  it('should update facets on removeFacet', () => {
    const { facets, removeFacet } = mountSearchParams();
    facets.value = [
      { field: 'testA', value: 'testA' },
      { field: 'testB', value: 'testB' },
    ];

    removeFacet(0);

    expect(facets.value[0]).toStrictEqual({
      field: 'testB', value: 'testB',
    });
  });

  it('should return search params when calling "getSearchParams"', () => {
    vi.mocked(useRoute, { partial: true }).mockReturnValue({
      query: {
        query: 'search',
        affects__ps_component: 'test',
      },
    });
    const { getSearchParams } = mountSearchParams();

    const searchParams = getSearchParams();

    expect(searchParams).toStrictEqual({
      query: 'search',
      affects__ps_component: 'test',
    });
  });

  it('should return facets when calling "populatedFacets"', () => {
    vi.mocked(useRoute, { partial: true }).mockReturnValue({
      query: {
        query: 'search',
        affects__ps_component: 'test',
        acknowledgments__name: 'test',
      },
    });
    const { populateFacets } = mountSearchParams();

    const facets = populateFacets();

    expect(facets).toEqual([
      { field: 'affects__ps_component', value: 'test' },
      { field: 'acknowledgments__name', value: 'test' },
      { field: '', value: '' },
    ]);
  });
});
