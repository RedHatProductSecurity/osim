import { describe, it, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createPinia, setActivePinia } from 'pinia';

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
    expect(searchStore.savedSearches).toEqual([]);
  });

  it('saveSearch', () => {
    searchStore.saveSearch({ component: 'test' }, 'test');

    expect(searchStore.savedSearches[0].searchFilters).toEqual({ component: 'test' });
    expect(searchStore.savedSearches[0].queryFilter).toBe('test');
  });

  it('resetFilter', () => {
    searchStore.resetSearches();
    expect(searchStore.savedSearches).toEqual([]);
  });
});
