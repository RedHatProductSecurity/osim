import { ref, onMounted, watch, watchEffect } from 'vue';import { z } from 'zod';
import { useRoute, useRouter } from 'vue-router';
import { flawFields, allowedEmptyFieldMapping } from '@/constants/flawFields';

export enum FilterOperator {
  AND = 'AND',
  OR = 'OR',
  EQUALS = 'EQUALS',
  CONTAINS = 'CONTAINS'
}
export enum FilterTextOperator {
  EQUALS = 'EQUALS',
  CONTAINS = 'CONTAINS'
}

type Facet = {
  field: string;
  value: string;
  filterOperator: FilterOperator;
  filterTextOperator: FilterTextOperator;
};

const facets = ref<Facet[]>([]);
const search = ref('');

const searchQuery = z.object({
  query: z.object({
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
          const values = route.query[key].split(',');
          values.forEach(value => {
            let filterOperator = FilterOperator.AND;
            let filterTextOperator = FilterTextOperator.EQUALS;
            let facetValue = value;
            if (facetValue.startsWith('~')) {
              filterTextOperator = FilterTextOperator.CONTAINS;
              facetValue = facetValue.substring(1);
            }
            if (facetValue.startsWith('-')) {
              filterOperator = FilterOperator.OR;
              facetValue = facetValue.substring(1);
            }
            facets.push({
              filterOperator,
              filterTextOperator,
              field: key,
              value: facetValue,
            });
          });
        }
      });
    }

    facets.push({
      field: '',
      value: '',
      filterOperator: FilterOperator.AND,
      filterTextOperator:  FilterTextOperator.EQUALS,
    });
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
    facets.value.push({
      field: '',
      value: '',
      filterOperator: FilterOperator.AND,
      filterTextOperator: FilterTextOperator.EQUALS,
    });
  }

  function removeFacet(index: number) {
    const removedField = facets.value[index].field;
    facets.value.splice(index, 1);
    if (!facets.value.length) {
      addFacet();
    }

    // Update FilterOperator for first Item if all logic is OR
    const sameFacets = facets.value.filter(({ field }) => field === removedField);
    if (sameFacets.length > 0 && sameFacets.every(({ filterOperator }) => filterOperator === FilterOperator.OR)) {
      sameFacets[0].filterOperator = FilterOperator.AND;
    }
  }

  function submitQuickSearch(searchQuery: string) {
    search.value = searchQuery;
    router.push({ name: 'search', query: { query: searchQuery } });
  }

  function convertFieldValuetoQuery(item: Facet){
    const {
      value,
      filterOperator = FilterOperator.AND,
      filterTextOperator = FilterTextOperator.EQUALS,
    } = item;
    let searchValue = value;
    if (filterOperator === FilterOperator.OR) {
      searchValue = `-${searchValue}`;
    }
    if (filterTextOperator == FilterTextOperator.CONTAINS) {
      searchValue = `~${searchValue}`;
    }
    return searchValue;
  }

  function submitAdvancedSearch() {
    const params = facets.value.reduce(
      (fields, item) => {
        const { field, value } = item;
        if (field && value || allowedEmptyFieldMapping[field]) {
          const searchValue = convertFieldValuetoQuery(item);
          if (!fields[field]) {
            fields[field] = searchValue;
          } else {
            const values = fields[field].split(',');
            fields[field] = [...values, searchValue].join(',');
          }
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
