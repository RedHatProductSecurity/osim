import { type Ref, ref, computed, watch } from 'vue';

export function usePagination(totalPages: Ref<number>, initialItemsPerPage: number) {
  const minItemsPerPage = 5;
  const maxItemsPerPage = 20;
  const maxPagesToShow = 7;
  const currentPage = ref(1);
  const itemsPerPage = ref(initialItemsPerPage);

  const pages = computed(() => {
    const result: number[] = [];
    if (totalPages.value > maxPagesToShow) {
      if (currentPage.value > 3 && currentPage.value < totalPages.value - 2) {
        return [1, '..', currentPage.value - 1, currentPage.value, currentPage.value + 1, '..', totalPages.value];
      } else if (currentPage.value <= 3) {
        return [...Array.from({ length: 5 }, (_, i) => i + 1), '..', totalPages.value];
      } else if (currentPage.value >= totalPages.value - 2) {
        return [1, '..', ...Array.from({ length: 5 }, (_, i) => totalPages.value - 4 + i)];
      }
    } else {
      for (let i = 1; i <= totalPages.value; i++) {
        result.push(i);
      }
    }
    return result;
  });

  function changePage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  }

  watch(pages, () => {
    if (currentPage.value > pages.value.length) {
      currentPage.value = pages.value.length;
    }
  });

  return {
    pages,
    itemsPerPage,
    currentPage,
    minItemsPerPage,
    maxItemsPerPage,
    changePage,
  };
}
