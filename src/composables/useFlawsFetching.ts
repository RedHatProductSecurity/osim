import { ref } from 'vue';

import { getFlaws } from '@/services/FlawService';
import { allowedEmptyFieldMapping } from '@/constants/flawFields';

function finializeRequestParams(params: Record<string, 'isempty' | 'nonempty' | string> = {}) {
  const requestParams: Record<string, any> = {};
  for (const key in params) {
    if (['isempty', 'nonempty'].includes(params[key]) && allowedEmptyFieldMapping[key]) {
      requestParams[allowedEmptyFieldMapping[key]] = params[key] === 'isempty' ? 1 : 0;
    } else {
      requestParams[key] = params[key];
    }
  }
  return requestParams;
}

export function useFlawsFetching() {
  const isFinalPageFetched = ref(false);
  const isLoading = ref(false);
  const issues = ref<any[]>([]);
  const offset = ref(0);
  const pagesize = 20;
  const total = ref(0);

  function loadFlaws(params: any = {}) {
    offset.value = 0;
    isFinalPageFetched.value = false;
    isLoading.value = true;
    issues.value = [];
    total.value = 0;

    getFlaws(offset.value, 100, finializeRequestParams(params.value))
      .then((response) => {
        issues.value = response.data.results;
        // response will have next property for next api call
        if (response.data.next) {
          const url = new URL(response.data.next);
          const params = new URLSearchParams(url.search);
          offset.value = Number(params.get('offset') || 0);
        } else {
          isFinalPageFetched.value = true;
          offset.value += response.data.results.length;
        }

        total.value = response.data.count;
      })
      .catch((err) => {
        console.error('useFlawsFetching::loadFlaws() IssueQueue: getFlaws error: ', err);
      })
      .finally(() => {
        isLoading.value = false;
      });
  }

  function loadMoreFlaws(params: any = {}) {
    if (isLoading.value || isFinalPageFetched.value) {
      return; // Early exit if already loading
    }
    isLoading.value = true;

    getFlaws(offset.value, pagesize, finializeRequestParams(params.value))
      .then((response) => {
        issues.value = [...issues.value, ...response.data.results];
        // response will have next property for next api call
        if (response.data.next) {
          const url = new URL(response.data.next);
          const params = new URLSearchParams(url.search);
          offset.value = Number(params.get('offset') || 0);
        } else {
          isFinalPageFetched.value = true;
          offset.value += response.data.results.length;
        }
      })
      .catch((err) => {
        console.error('useFlawsFetching::loadMoreFlaws() Error fetching more flaws: ', err);
      })
      .finally(() => {
        isLoading.value = false;
      });
  }

  return {
    issues,
    isFinalPageFetched,
    isLoading,
    offset,
    pagesize,
    total,
    loadFlaws,
    loadMoreFlaws,
  };
}
