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
        value: defaults,
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
    searchStore.saveSearch('name', { component: 'test' }, 'test');

    expect(searchStore.savedSearches[0].name).toEqual('name');
    expect(searchStore.savedSearches[0].searchFilters).toEqual({ component: 'test' });
    expect(searchStore.savedSearches[0].queryFilter).toBe('test');
  });

  it('removeSearch', () => {
    searchStore.removeSearch(0);
    expect(searchStore.savedSearches).toEqual([]);
  });

  it('setDefaultSearch', () => {
    searchStore.saveSearch('name', { component: 'test' }, 'test');
    searchStore.setDefaultSearch(0);
    expect(searchStore.savedSearches[0].isDefault).toBeTruthy();
  });

  it('swap DefaultSearch', () => {
    searchStore.saveSearch('name1', { component: 'test1' }, 'test1');
    searchStore.setDefaultSearch(0);
    searchStore.saveSearch('name2', { component: 'test2' }, 'test2');
    searchStore.setDefaultSearch(1);
    expect(!searchStore.savedSearches[0].isDefault && searchStore.savedSearches[1].isDefault).toBeTruthy();
  });

  it('resetSearches', () => {
    searchStore.saveSearch('name1', { component: 'test1' }, 'test1');
    searchStore.saveSearch('name2', { component: 'test2' }, 'test2');
    searchStore.resetSearches();
    expect(searchStore.savedSearches).toEqual([]);
  });
});
