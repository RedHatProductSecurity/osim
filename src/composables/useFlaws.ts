import { ref } from 'vue';
import { getFlaws } from '@/services/FlawService';

export function useFlaws() {
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

    getFlaws(offset.value, 100, params.value)
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
        console.error('IssueQueue: getFlaws error: ', err);
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

    getFlaws(offset.value, pagesize, params.value)
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
        console.error('Error fetching more flaws: ', err);
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
    loadMoreFlaws
  };
}
