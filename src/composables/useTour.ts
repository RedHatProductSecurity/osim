import { computed } from 'vue';

import { useRouter } from 'vue-router';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { useFlaw } from '@/composables/useFlaw';

import { useTourStore } from '@/stores/TourStore';
import { useToastStore } from '@/stores/ToastStore';
import { useSettingsStore } from '@/stores/SettingsStore';
import { getAllTourIds, TOURS, type Tour } from '@/config/tours';

export function useTour() {
  const tourStore = useTourStore();
  const { addToast } = useToastStore();
  const settingsStore = useSettingsStore();
  const { settings } = settingsStore;
  const router = useRouter();
  const { setFlaw } = useFlaw();

  const availableTours = computed(() => {
    return TOURS.map(tour => ({
      ...tour,
      isCompleted: tourStore.isTourCompleted(tour.id),
    }));
  });

  const hasUncompletedTours = computed(() => {
    return availableTours.value.some(tour => !tour.isCompleted);
  });

  async function startTour(tour: Tour) {
    // Enable tour mode to prevent API calls
    tourStore.startTour(tour.id);

    // Run tour-specific setup if provided
    if (tour.setup) {
      await tour.setup({ router, setFlaw });
    }

    const driverObj = driver({
      showProgress: true,
      animate: false,
      showButtons: ['next', 'previous', 'close'],
      onDestroyed: async () => {
        // Run tour-specific cleanup if provided
        if (tour.cleanup) {
          await tour.cleanup({ router, setFlaw });
        }

        // Disable tour mode when tour ends
        tourStore.endTour();

        tourStore.markTourCompleted(tour.id);
      },
      steps: tour.steps,
    });

    driverObj.drive();
  }

  function checkForNewTours() {
    const allTourIds = getAllTourIds();
    const uncompletedTours = tourStore.getUncompletedTours(allTourIds);
    const notificationShown = settings.toursNotificationShown || [];

    // Find tours that are uncompleted and haven't had their notification shown yet
    const newTours = uncompletedTours.filter(tourId => !notificationShown.includes(tourId));

    if (newTours.length > 0) {
      const tourNames = newTours
        .map(tourId => TOURS.find(t => t.id === tourId)?.name)
        .filter(Boolean)
        .join(', ');

      addToast({
        title: 'New Tour Available!',
        body: `Check out the new tour${newTours.length > 1 ? 's' : ''}: ${tourNames}. `
        + 'Click the gift icon in the navbar to get started.',
        css: 'info',
        timeoutMs: 0, // Don't auto-dismiss
      });

      settings.toursNotificationShown = [...notificationShown, ...newTours];
    }
  }

  return {
    availableTours,
    hasUncompletedTours,
    startTour,
    checkForNewTours,
  };
}
