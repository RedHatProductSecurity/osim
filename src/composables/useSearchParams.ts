import { ref, onMounted, watch, watchEffect } from 'vue';import { z } from 'zod';
import { useRoute, useRouter } from 'vue-router';
import { flawFields } from '@/constants/flawFields';

type Facet = {
  field: string;
  value: string;
};

const facets = ref<Facet[]>([]);
const search = ref('');

const searchQuery = z.object({
  query: z.object({
    query: z.string().nullish(),
  }),
});

export const allowedEmptyFields = [
  'cve_id',
];

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
    search.value = parsedRoute.query.query || '';
    if (parsedRoute.query.query) {
      params.search = parsedRoute.query.query;
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

  watch(() => route.query.query, () => {
    // repopulate facets after quick query changed
    search.value = `${route.query.query || ''}`;
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
    router.push({ name: 'search', query: { query: searchQuery } });
  }

  function submitAdvancedSearch() {
    const params = facets.value.reduce(
      (fields, { field, value }) => {
        if (field && value || allowedEmptyFields.includes(field)) {
          fields[field] = value;
        }
        return fields;
      },
      {} as Record<string, string>,
    );
    router.replace({
      query:{
        ...(route.query.query && ({ query: route.query.query })),
        ...params,
      }
    });
  }

  return {
    facets,
    search,
    removeFacet,
    addFacet,
    populateFacets,
    getSearchParams,
    submitAdvancedSearch,
    submitQuickSearch,
  };
}
