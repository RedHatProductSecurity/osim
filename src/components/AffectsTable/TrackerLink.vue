<script lang="ts" setup>
import { computed } from 'vue';

import type { ZodTrackerType } from '@/types';
import { trackerUrl } from '@/services/TrackerService';

const { tracker } = defineProps<{
  tracker: null | undefined | ZodTrackerType;
}>();

const url = computed(() => tracker ? trackerUrl(tracker?.type, tracker?.external_system_id) : '');
</script>
<template>
  <a
    v-if="tracker?.external_system_id"
    :href="url"
    target="_blank"
  >
    {{ tracker.external_system_id }}
    <i class="bi-box-arrow-up-right"></i>
  </a>
  <span
    v-else-if="tracker && !tracker?.external_system_id"
    title="This tracker does not have an external ID"
  >None</span>
</template>
