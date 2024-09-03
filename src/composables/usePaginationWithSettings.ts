import { useSettingsStore, type SettingsType } from '@/stores/SettingsStore';
import { type Ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePagination } from './usePagination';

type PaginationSetting = keyof Pick<SettingsType, 'affectsPerPage' | 'trackersPerPage'>;
type PaginationOptions = {
  maxPagesToShow?: number;
  minItemsPerPage?: number;
  maxItemsPerPage?: number;
  setting: PaginationSetting;
};

export function usePaginationWithSettings(itemsToPaginate: Ref<any[]>, options: PaginationOptions) {
  const { settings } = storeToRefs(useSettingsStore());
  const {
    setting,
    maxPagesToShow = 7,
    minItemsPerPage = 5,
    maxItemsPerPage = 20,
  } = options;

  function decreaseItemsPerPage() {
    if (settings.value[setting] > minItemsPerPage) {
      settings.value[setting]--;
    }
  }

  function increaseItemsPerPage() {
    if (settings.value[setting] < maxItemsPerPage) {
      settings.value[setting]++;
    }
  }

  const totalPages = computed(() =>
    Math.ceil(itemsToPaginate.value.length / settings.value[setting])
  );

  const {
    pages,
    currentPage,
    changePage
  } = usePagination(totalPages, maxPagesToShow);

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * settings.value[setting];
    const end = start + settings.value[setting];
    return itemsToPaginate.value.slice(start, end);
  });

  return {
    changePage,
    decreaseItemsPerPage,
    increaseItemsPerPage,
    currentPage,
    minItemsPerPage,
    maxItemsPerPage,
    pages,
    paginatedItems,
    totalPages,
  };
}
