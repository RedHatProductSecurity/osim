import { ref, onMounted, watch, watchEffect, computed } from 'vue';

import { z } from 'zod';
import { useRoute, useRouter } from 'vue-router';

import { flawFields, allowedEmptyFieldMapping } from '@/constants/flawFields';

type Facet = {
  field: string;
  value: string;
};

type orderMode = 'asc' | 'desc';

const searchQuery = z.object({
  query: z.object({
    search: z.string().nullish(),
    query: z.string().nullish(),
    order: z.string().nullish(),
  }),
});

const facets = ref<Facet[]>([]);
const query = ref<string>('');
const order = computed(() => orderMode.value === 'asc' && orderField.value ? `-${orderField.value}` : orderField.value);
const orderField = ref<string>('');
const orderMode = ref<orderMode>('asc');
const search = ref('');

function toggleSortOrder() {
  orderMode.value = orderMode.value === 'desc' ? 'asc' : 'desc';
}

export function useSearchParams() {
  const route = useRoute();
  const router = useRouter();

  const populateFacets = (): Facet[] => {
    // populate facets from route query
    const facets: Facet[] = [];

    if (route.query && Object.keys(route.query).length > 0) {
      Object.keys(route.query).forEach((key) => {
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
    query.value = parsedRoute.query.query || '';
    if (parsedRoute.query.query) {
      params.query = parsedRoute.query.query;
    }
    if (parsedRoute.query.order) {
      params.order = parsedRoute.query.order;
      if ((route.query.order as string).startsWith('-')) {
        orderMode.value = 'asc';
        orderField.value = (route.query.order as string).slice(1);
      } else {
        orderMode.value = 'desc';
        orderField.value = route.query.order as string;
      }
    }
    if (route.query && Object.keys(route.query).length > 0) {
      Object.keys(route.query).forEach((key) => {
        if (flawFields.includes(key) && typeof route.query[key] === 'string') {
          params[key] = route.query[key] as string;
        }
      });
    }
    return params;
  };

  onMounted(() => {
    facets.value = populateFacets();
    search.value = `${route.query.search || ''}`;
    query.value = `${route.query.query || ''}`;
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
    query.value = route.query.query as string;
    if ((route.query.order as string).startsWith('-')) {
      orderMode.value = 'asc';
      orderField.value = (route.query.order as string).slice(1);
    } else {
      orderField.value = route.query.order as string;
      orderField.value = 'desc';
    }
  });

  function addFacet() {
    facets.value.push({ field: '', value: '' });
  }

  function removeFacet(index: number = 0) {
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
        if (field && (value || allowedEmptyFieldMapping[field])) {
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
    params = order.value
      ? { ...params, order: order.value }
      : params;
    router.replace({
      query: {
        ...params,
      },
    });
  }

  function loadAdvancedSearch(query: string, params: Record<string, string>) {
    params = query
      ? { ...params, query: query }
      : params;
    router.replace({
      query: {
        ...params,
      },
    }).then(() => {
      facets.value = populateFacets();
    });
  }

  return {
    facets,
    query,
    order,
    orderField,
    orderMode,
    toggleSortOrder,
    search,
    removeFacet,
    addFacet,
    populateFacets,
    getSearchParams,
    submitAdvancedSearch,
    loadAdvancedSearch,
    submitQuickSearch,
  };
}
