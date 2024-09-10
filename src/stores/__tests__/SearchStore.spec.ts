import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

import { useSearchStore } from '../SearchStore';

const initialState = {
  searchFilters: {},
};

export const mockSearchStore = createTestingPinia({
  initialState,
});

vi.mock('@vueuse/core', () => ({
  useLocalStorage: vi.fn((key: string, defaults) => {
    return {
      SearchStore: {
        value: defaults || {
          searchFilters: { test: 'test' },
        },
      },
    }[key];
  }),
}));

describe('settingsStore', () => {
  let searchStore: ReturnType<typeof useSearchStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    searchStore = useSearchStore();
  });

  it('initializes', () => {
    expect(searchStore.searchFilters).toEqual({});
  });

  it('saveFilter', () => {
    (useLocalStorage as Mock).mockReturnValue({
      SearchStore: {
        value: {
          searchFilters: { test: 'test' },
        },
      },
    });
    searchStore.saveFilter({ component: 'test' });
    expect(searchStore.searchFilters).toEqual({ component: 'test' });
  });

  it('resetFilter', () => {
    (useLocalStorage as Mock).mockReturnValue({
      SearchStore: {
        value: {
          searchFilters: { test: 'test' },
        },
      },
    });
    searchStore.resetFilter();
    expect(searchStore.searchFilters).toEqual({});
  });
});
