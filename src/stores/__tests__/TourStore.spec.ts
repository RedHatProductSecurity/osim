import { ref } from 'vue';

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

import { useTourStore } from '@/stores/TourStore';

vi.mock('@vueuse/core', async (importOriginal) => {
  const { ref } = await import('vue');
  const vueUse = await importOriginal<typeof import('@vueuse/core')>();

  return {
    ...vueUse,
    useLocalStorage: vi.fn().mockImplementation((key, initialValue) => ref(initialValue)),
  };
});

describe('tourStore', () => {
  let tourStore: ReturnType<typeof useTourStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    tourStore = useTourStore();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty completed tours', () => {
    expect(tourStore.completedTours).toEqual([]);
  });

  it('marks a tour as completed', () => {
    const tourId = 'example-tour';

    tourStore.markTourCompleted(tourId);

    expect(tourStore.completedTours).toContain(tourId);
    expect(tourStore.isTourCompleted(tourId)).toBe(true);
  });

  it('does not add duplicate tour IDs when marking as completed', () => {
    const tourId = 'example-tour';

    tourStore.markTourCompleted(tourId);
    tourStore.markTourCompleted(tourId);
    tourStore.markTourCompleted(tourId);

    expect(tourStore.completedTours).toHaveLength(1);
    expect(tourStore.completedTours).toEqual([tourId]);
  });

  it('checks if a tour is completed', () => {
    const completedTourId = 'completed-tour';
    const incompleteTourId = 'incomplete-tour';

    tourStore.markTourCompleted(completedTourId);

    expect(tourStore.isTourCompleted(completedTourId)).toBe(true);
    expect(tourStore.isTourCompleted(incompleteTourId)).toBe(false);
  });

  it('gets uncompleted tours from a list of tour IDs', () => {
    const allTourIds = ['tour-1', 'tour-2', 'tour-3', 'tour-4'];

    tourStore.markTourCompleted('tour-1');
    tourStore.markTourCompleted('tour-3');

    const uncompletedTours = tourStore.getUncompletedTours(allTourIds);

    expect(uncompletedTours).toEqual(['tour-2', 'tour-4']);
  });

  it('resets all tours', () => {
    tourStore.markTourCompleted('tour-1');
    tourStore.markTourCompleted('tour-2');
    tourStore.markTourCompleted('tour-3');

    expect(tourStore.completedTours).toHaveLength(3);

    tourStore.resetAllTours();

    expect(tourStore.completedTours).toEqual([]);
  });

  it('$reset clears all completed tours', () => {
    tourStore.markTourCompleted('tour-1');
    tourStore.markTourCompleted('tour-2');

    expect(tourStore.completedTours).toHaveLength(2);

    tourStore.$reset();

    expect(tourStore.completedTours).toEqual([]);
  });

  it('loads existing completed tours from localStorage', () => {
    const existingCompletedTours = ['tour-1', 'tour-2', 'tour-3'];
    vi.mocked(useLocalStorage).mockReturnValueOnce(
      ref({ completedTours: existingCompletedTours }),
    );

    setActivePinia(createPinia());
    const newTourStore = useTourStore();

    expect(newTourStore.completedTours).toEqual(existingCompletedTours);
  });
});
