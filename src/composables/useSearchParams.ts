import { ref, onMounted, watch, watchEffect } from 'vue';import { z } from 'zod';
import { useRoute, useRouter } from 'vue-router';
import { DateTime } from 'luxon';
import { flawFields } from '@/constants/flawFields';
import { DateRangeTypeEnum } from '@/constants/range';

type Facet = {
  field: string;
  value: string;
  range?: {
    type: DateRangeTypeEnum | undefined,
    start: string | undefined,
    end: string | undefined
  }
};

const facets = ref<Facet[]>([]);
const search = ref('');

const searchQuery = z.object({
  query: z.object({
    query: z.string().nullish(),
  }),
});

export function supportRangeOption (field: string): string {
  const mapping: Record<string, string> = {
    created_dt: 'dateRange',
    updated_dt: 'dateRange'
  };
  return mapping[field] || '';
}

export function useSearchParams() {

  const route = useRoute();

  const router = useRouter();

  function getRangeFromURL(value: string, key: string) {
    let type: DateRangeTypeEnum | undefined;
    let start: string | undefined;
    let end: string | undefined;
    const rangeOption = supportRangeOption(key);

    if (rangeOption) {
      const values = value.split('_');
      if (values.length > 0) {
        type = values[0] as DateRangeTypeEnum;
        if (values[1] && values[2]) {
          start = rangeOption === 'dateRange' ? new Date(values[1]).toISOString() : values[1];
          end = rangeOption === 'dateRange' ? new Date(values[2]).toISOString() : values[2];
          type = DateRangeTypeEnum.CUSTOM;
        }
      }
      return {
        type,
        start,
        end
      };
    } else {
      return null;
    }
  }

  function parseValueForURL(facet: Facet) {
    const { field, value, range } = facet;
    const rangeOption = supportRangeOption(field);
    if (rangeOption && range) {
      const values: string[] = [range.type as string];
      if (range.type === DateRangeTypeEnum.CUSTOM) {
        if (range.start) {
          values.push(
            rangeOption === 'dateRange' ? parseDate(range.start) : range.start
          );
        }
        if (range.end) {
          values.push(
            rangeOption === 'dateRange' ? parseDate(range.end) : range.end
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
            field: key,
            ...(range && { range })
          });
        }
      });
    }

    facets.push({
      field: '',
      value: '',
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
    const newFacet = facets.value.at(-1);
    if (!newFacet) {
      return;
    }
    if (newFacet?.field && newFacet.value) {
      addFacet();
      return;
    }

    if (supportRangeOption(newFacet?.field)) {
      // assign range values
      if (!newFacet.range) {
        newFacet.range = {
          type:undefined,
          start: undefined,
          end: undefined
        };
      }

      if (
        [
          DateRangeTypeEnum.THIS_WEEK,
          DateRangeTypeEnum.LAST_WEEK,
          DateRangeTypeEnum.THIS_MONTH,
          DateRangeTypeEnum.LAST_MONTH,
        ].includes(newFacet.range.type!)
        || DateRangeTypeEnum.CUSTOM === newFacet.range.type && newFacet.range.start && newFacet.range.end
      ){
        addFacet();
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

  function parseDate(date: string): string {
    return DateTime.fromISO(date).toUTC().toFormat('yyyy-MM-dd');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function rangeFieldName(name: string) {
    // This need to update for supporting number range like GTE, LTE, EQUALS
    const mapping: Record<string, string> = {};
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
