import { ref } from 'vue';
import { describe, it, expect } from 'vitest';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  it('should return all pages when totalPages is less than or equal to maxPagesToShow', () => {
    const totalPages = ref(5);
    const { pages } = usePagination(totalPages, 7);

    expect(pages.value).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle the case where currentPage is in the middle of a large pagination range', () => {
    const totalPages = ref(10);
    const { pages, currentPage, changePage } = usePagination(totalPages, 7);

    changePage(5);

    expect(currentPage.value).toBe(5);
    expect(pages.value).toEqual([1, '..', 4, 5, 6, '..', 10]);
  });

  it('should handle the case where currentPage is at the beginning', () => {
    const totalPages = ref(10);
    const { pages, currentPage, changePage } = usePagination(totalPages, 7);

    changePage(1);

    expect(currentPage.value).toBe(1);
    expect(pages.value).toEqual([1, 2, 3, 4, 5, '..', 10]);
  });

  it('should handle the case where currentPage is at the end', () => {
    const totalPages = ref(10);
    const { pages, currentPage, changePage } = usePagination(totalPages, 7);

    changePage(9);

    expect(currentPage.value).toBe(9);
    expect(pages.value).toEqual([1, '..', 6, 7, 8, 9, 10]);
  });

  it('should not change the currentPage if changePage is called with an invalid page number', () => {
    const totalPages = ref(5);
    const { currentPage, changePage } = usePagination(totalPages, 7);

    changePage(6);

    expect(currentPage.value).toBe(1);
  });

  it('should correctly compute pages where currentPage is in the middle range of a very large totalPages', () => {
    const totalPages = ref(100);
    const { pages, changePage } = usePagination(totalPages, 7);

    changePage(50);

    expect(pages.value).toEqual([1, '..', 49, 50, 51, '..', 100]);
  });

  it('should correctly handle a totalPages value of 1', () => {
    const totalPages = ref(1);
    const { pages, currentPage } = usePagination(totalPages, 7);

    expect(pages.value).toEqual([1]);
    expect(currentPage.value).toBe(1);
  });
});
