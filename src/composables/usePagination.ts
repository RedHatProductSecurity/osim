import { type Ref, ref, computed, watch } from 'vue';

export function usePagination(totalPages: Ref<number>, maxPagesToShow = 7) {
  const currentPage = ref(1);

  const pages = computed(() => {
    const btnCount = 5;
    if (totalPages.value > maxPagesToShow) {
      if (currentPage.value > 3 && currentPage.value < totalPages.value - 2) {
        return [1, '..', currentPage.value - 1, currentPage.value, currentPage.value + 1, '..', totalPages.value];
      } else if (currentPage.value <= 3) {
        return [...Array.from({ length: btnCount }, (_, i) => i + 1), '..', totalPages.value];
      } else if (currentPage.value >= totalPages.value - 2) {
        return [1, '..', ...Array.from({ length: btnCount }, (_, i) => totalPages.value - 4 + i)];
      }
    } 
  
    return Array.from({ length: totalPages.value }, (_, i) => i + 1);
  });

  function changePage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  }

  watch(pages, () => {
    if (currentPage.value > totalPages.value && pages.value.length > 1) {
      currentPage.value = totalPages.value;
    }
  });

  return {
    pages,
    currentPage,
    changePage,
  };
}
