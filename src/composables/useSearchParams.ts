import { ref, onMounted, watch, watchEffect } from 'vue';import { z } from 'zod';
import { useRoute, useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { flawFields } from '@/constants/flawFields';

export enum DateRange {
  THIS_WEEK = 'This Week',
  LAST_WEEK = 'Last Week',
  THIS_MONTH = 'This Month',
  LAST_MONTH = 'Last Month',
  CUSTOM = 'Custom',
}

type Facet = {
  field: string;
  value: string;
  range: {
    type: DateRange,
    start: string | null,
    end: string | null
  }
};

const facets = ref<Facet[]>([]);
const search = ref('');

const searchQuery = z.object({
  query: z.object({
    query: z.string().nullish(),
  }),
});

export function supportRangeOption (field: string) {
  const mapping = {
    created_dt: 'dateRange',
    updated_dt: 'dateRange'
  };
  return mapping[field];
}

export function useSearchParams() {

  const route = useRoute();

  const router = useRouter();

  function getRangeFromURL(value: string, key: string) {
    let type = null;
    let start = null;
    let end = null;
    if (supportRangeOption(key)) {
      const values = value.split('_');
      if (values.length > 0) {
        type = values[0];
        if (values[1] && values[2]) {
          start = supportRangeOption(key) === 'dateRange' ? new Date(values[1]).toISOString() : values[1];
          end = supportRangeOption(key) === 'dateRange' ? new Date(values[2]).toISOString() : values[2];
          type = DateRange.CUSTOM;
        }
      }
    }
    return {
      type,
      start,
      end
    };
  }

  function parseValueForURL(facet) {
    const { field, value, range } = facet;
    if (supportRangeOption(field)) {
      const values = [range.type];
      if (range.type === DateRange.CUSTOM) {
        if (range.start) {
          values.push(
            supportRangeOption(field) === 'dateRange' ? parseDate(range.start) : range.start
          );
        }
        if (range.end) {
          values.push(
            supportRangeOption(field) === 'dateRange'
              ? parseDate(range.end)
              : range.end
          );
        }
      }
      return values.join('_');
    }
    return value;
  }

  const populateFacets = (): Facet[] => {
    // populate facets from route query
    const facets: Facet[] = [];

    if (route.query && Object.keys(route.query).length > 0) {
      Object.keys(route.query).forEach(key => {
        if (flawFields.includes(key) && typeof route.query[key] === 'string') {
          const value = route.query[key] as string;
          const range = getRangeFromURL(value, key);
          facets.push({
            value,
            range,
            field: key,
          });
        }
      });
    }

    facets.push({
      field: '',
      value: '',
      range: {
        type: null,
        start: null,
        end: null,
      },
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
    if (newFacet?.field) {
      if (newFacet.value) {
        addFacet();
      } else {
        if (supportRangeOption(newFacet?.field)) {
          switch (newFacet.range.type) {
          case DateRange.THIS_WEEK:
          case DateRange.LAST_WEEK:
          case DateRange.THIS_MONTH:
          case DateRange.LAST_MONTH:
            addFacet();
            break;
          case DateRange.CUSTOM:
            if (newFacet.range.start && newFacet.range.end) {
              addFacet();
            }
            break;
          }
        }
      }
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
      range: {
        type: null,
        start: null,
        end: null
      }
    });
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

  function parseDate(date): string {
    return DateTime.fromISO(date).toUTC().toFormat('yyyy-MM-dd');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function rangeFieldName(name: string) {
    // This need to update for supporting number range like GTE, LTE, EQUALS
    const mapping = {};
    return mapping[name] || name;
  }

  function submitAdvancedSearch() {
    const params = facets.value.reduce(
      (fields, facet) => {
        const { field } = facet;
        if (field) {
          const parsedValue = parseValueForURL(facet);
          fields[field] = parsedValue;
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
