import { type Ref, computed } from 'vue';

import { storeToRefs } from 'pinia';

import { useSettingsStore, type SettingsType } from '@/stores/SettingsStore';

import { usePagination } from './usePagination';

type PaginationSetting = keyof Pick<SettingsType, 'affectsPerPage' | 'trackersPerPage'>;
type PaginationOptions = {
  maxItemsPerPage?: number;
  maxPagesToShow?: number;
  minItemsPerPage?: number;
  setting: PaginationSetting;
};

export function usePaginationWithSettings(itemsToPaginate: Ref<any[]>, options: PaginationOptions) {
  const { settings } = storeToRefs(useSettingsStore());
  const {
    maxItemsPerPage = 20,
    maxPagesToShow = 7,
    minItemsPerPage = 5,
    setting,
  } = options;

  function decreaseItemsPerPage() {
    settings.value[setting] = Math.max(settings.value[setting] - 5, minItemsPerPage);
  }

  function increaseItemsPerPage() {
    settings.value[setting] = Math.min(settings.value[setting] + 5, maxItemsPerPage);
  }

  const totalPages = computed(() =>
    Math.ceil(itemsToPaginate.value.length / settings.value[setting]),
  );

  const {
    changePage,
    currentPage,
    pages,
  } = usePagination(totalPages, maxPagesToShow);

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * settings.value[setting];
    const end = start + settings.value[setting];
    return itemsToPaginate.value.slice(start, end);
  });

  function handlePerPageInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (target) {
      const value = Number(target.value);
      if (value && value <= maxItemsPerPage && value >= minItemsPerPage) {
        settings.value[setting] = value;
      }
    }
  };

  return {
    changePage,
    decreaseItemsPerPage,
    increaseItemsPerPage,
    handlePerPageInput,
    currentPage,
    minItemsPerPage,
    maxItemsPerPage,
    pages,
    paginatedItems,
    totalPages,
  };
}
