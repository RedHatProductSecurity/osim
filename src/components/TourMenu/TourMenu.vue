<script lang="ts" setup>
import { onMounted } from 'vue';

import { useTour } from '@/composables/useTour';

const { availableTours, checkForNewTours, hasUncompletedTours, startTour } = useTour();

// Check for new tours and show notification on mount
onMounted(checkForNewTours);
</script>
<template>
  <div class="btn-group me-2">
    <button
      type="button"
      class="btn text-white border-0"
      data-bs-toggle="dropdown"
    >
      <i class="bi-gift-fill"></i>
      <span
        v-show="hasUncompletedTours"
        class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info"
      >
        New
        <span class="visually-hidden">New tours available</span>
      </span>
    </button>
    <ul class="dropdown-menu">
      <li v-if="availableTours.length === 0" class="dropdown-header">
        No tours available yet
      </li>
      <li
        v-for="tour in availableTours"
        :key="tour.id"
        class="dropdown-item bg-white d-flex justify-content-between align-content-center"
        role="button"
        @click="startTour(tour)"
      >
        <span class="me-2 text-black">
          <i :class="`bi ${tour.icon} me-2`"></i>
          {{ tour.name }}
        </span>
        <span v-if="!tour.isCompleted" class="badge bg-info">New</span>
      </li>
    </ul>
  </div>
</template>
