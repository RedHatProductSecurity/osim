import { computed, ref } from 'vue';

import { defineStore } from 'pinia';
import { z } from 'zod';
import { useLocalStorage } from '@vueuse/core';

export const TourProgressSchema = z.object({
  completedTours: z.array(z.string()).default([]),
});

export type TourProgressType = z.infer<typeof TourProgressSchema>;

const defaultTourProgress: TourProgressType = {
  completedTours: [],
};

const TOUR_PROGRESS_KEY = 'OSIM::TOUR-PROGRESS';

export const useTourStore = defineStore('TourStore', () => {
  const tourProgress = useLocalStorage(TOUR_PROGRESS_KEY, structuredClone(defaultTourProgress));

  // Validate and migrate tour progress on load
  const validatedTourProgress = TourProgressSchema.safeParse(tourProgress.value);
  if (validatedTourProgress.success) {
    if (JSON.stringify(validatedTourProgress.data) !== JSON.stringify(tourProgress.value)) {
      tourProgress.value = validatedTourProgress.data;
    }
  } else {
    tourProgress.value = structuredClone(defaultTourProgress);
  }

  const completedTours = computed(() => tourProgress.value.completedTours);

  // Active tour state - tracks which tour is currently running
  const activeTour = ref<null | string>(null);
  const isTourActive = computed(() => activeTour.value !== null);

  function markTourCompleted(tourId: string): void {
    if (!tourProgress.value.completedTours.includes(tourId)) {
      tourProgress.value.completedTours.push(tourId);
    }
  }

  function isTourCompleted(tourId: string): boolean {
    return tourProgress.value.completedTours.includes(tourId);
  }

  function getUncompletedTours(availableTourIds: string[]): string[] {
    return availableTourIds.filter(id => !isTourCompleted(id));
  }

  function resetAllTours(): void {
    tourProgress.value.completedTours = [];
  }

  function startTour(tourId: string): void {
    activeTour.value = tourId;
  }

  function endTour(): void {
    activeTour.value = null;
  }

  function $reset(): void {
    tourProgress.value = structuredClone(defaultTourProgress);
    activeTour.value = null;
  }

  return {
    $reset,
    activeTour,
    isTourActive,
    completedTours,
    markTourCompleted,
    isTourCompleted,
    getUncompletedTours,
    resetAllTours,
    startTour,
    endTour,
  };
});
