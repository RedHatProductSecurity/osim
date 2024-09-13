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
    expect(searchStore.searchFilters).toEqual({});
  });

  it('saveFilter', () => {
    searchStore.saveFilter({ component: 'test' }, 'test');

    expect(searchStore.searchFilters).toEqual({ component: 'test' });
    expect(searchStore.queryFilter).toBe('test');
  });

  it('resetFilter', () => {
    searchStore.resetFilter();
    expect(searchStore.searchFilters).toEqual({});
  });
});
