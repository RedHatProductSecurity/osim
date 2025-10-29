import type { DriveStep } from 'driver.js';
import type { Router } from 'vue-router';

import type { ZodFlawType } from '@/types/zodFlaw';

/**
 * Context provided to tour setup functions
 */
export interface TourSetupContext {
  router: Router;
  setFlaw: (flaw: ZodFlawType) => void;
}

export interface Tour {
  cleanup?: (context: TourSetupContext) => Promise<void> | void;
  icon: string; // Bootstrap icon class (e.g., 'bi-star-fill')
  id: string;
  name: string;
  setup?: (context: TourSetupContext) => Promise<void> | void;
  steps: DriveStep[];
}

/**
 * Registry of all available tours in the application.
 * Add new tours here to make them available in the tour dropdown.
 */
export const TOURS: Tour[] = [];

/**
 * Get a tour by its ID
 */
export function getTourById(tourId: string): Tour | undefined {
  return TOURS.find(tour => tour.id === tourId);
}

/**
 * Get all tour IDs
 */
export function getAllTourIds(): string[] {
  return TOURS.map(tour => tour.id);
}
