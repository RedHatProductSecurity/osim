import {  ref } from 'vue';
import { getFlaws } from '@/services/FlawService';

export function useFlaws() {
  const isFinalPageFetched = ref(false);
  const isLoading = ref(false);
  const issues = ref<any[]>([]);
  const offset = ref(0);
  const pagesize = 20;

  function loadFlaws(params: any = {}) {
    offset.value = 0;
    isFinalPageFetched.value = false;  
    isLoading.value = true;
    issues.value = [];

    getFlaws(offset.value, 100, params.value)
      .then((response) => {
        if (response.data.results.length < pagesize) {
          isFinalPageFetched.value = true;
        }
        issues.value = response.data.results;
        offset.value += response.data.results.length; // Increase the offset for next fetch
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
        if (response.data.results.length < pagesize) {
          isFinalPageFetched.value = true;
        }
        issues.value = [...issues.value, ...response.data.results];
        offset.value += response.data.results.length;
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
    loadFlaws,
    loadMoreFlaws
  };

}
