import { ref, onMounted, watch, watchEffect } from 'vue';import { z } from 'zod';
import { useRoute, useRouter } from 'vue-router';
import { flawFields, allowedEmptyFieldMapping } from '@/constants/flawFields';

type Facet = {
  field: string;
  value: string;
};

const facets = ref<Facet[]>([]);
const query = ref<string>('');
const search = ref('');

const searchQuery = z.object({
  query: z.object({
    search: z.string().nullish(),
    query: z.string().nullish(),
  }),
});

export function useSearchParams() {

  const route = useRoute();

  const router = useRouter();

  const populateFacets = (): Facet[] => {
    // populate facets from route query
    const facets: Facet[] = [];

    if (route.query && Object.keys(route.query).length > 0) {
      Object.keys(route.query).forEach(key => {
        if (flawFields.includes(key) && typeof route.query[key] === 'string') {
          facets.push({ field: key, value: route.query[key] as string });
        }
      });
    }

    facets.push({ field: '', value: '' });
    return facets;
  };

  const getSearchParams = () => {
    // generate search params based on route query
    const params: Record<string, string> = {};
    const parsedRoute = searchQuery.parse(route);
    search.value = parsedRoute.query.search || '';
    if (parsedRoute.query.search) {
      params.search = parsedRoute.query.search;
    }
    search.value = parsedRoute.query.query || '';
    if (parsedRoute.query.query) {
      params.query = parsedRoute.query.query;
    }
    if (route.query && Object.keys(route.query).length > 0) {
      Object.keys(route.query).forEach(key => {
        if (flawFields.includes(key) && typeof route.query[key] === 'string') {
          params[key] = route.query[key] as string;
        }
      });
    }
    return params;
  };

  onMounted(() => {
    facets.value = populateFacets();
  });

  watchEffect(() => {
    const newFacet = facets.value[facets.value.length - 1];
    if (newFacet?.field && newFacet?.value) {
      addFacet();
    }
  });

  watch(() => route.query.search, () => {
    // repopulate facets after quick query changed
    search.value = `${route.query.search || ''}`;
    facets.value = populateFacets();
  });

  function addFacet() {
    facets.value.push({ field: '', value: '' });
  }

  function removeFacet(index: number) {
    facets.value.splice(index, 1);
    if (!facets.value.length) {
      addFacet();
    }
  }

  function submitQuickSearch(searchQuery: string) {
    search.value = searchQuery;
    router.push({ name: 'search', query: { search: searchQuery } });
  }

  function submitAdvancedSearch() {
    let params = facets.value.reduce(
      (fields, { field, value }) => {
        if (field && value || allowedEmptyFieldMapping[field]) {
          fields[field] = value;
        }
        return fields;
      },
      {} as Record<string, string>,
    );

    params = query.value
      ? { ...params, query: query.value }
      : params;
    params = search.value
      ? { ...params, search: search.value }
      : params;
    router.replace({
      query:{
        ...params,
      }
    });
  }

  return {
    facets,
    query,
    search,
    removeFacet,
    addFacet,
    populateFacets,
    getSearchParams,
    submitAdvancedSearch,
    submitQuickSearch,
  };
}
